-- Links are signed by the Edge Function and are NEVER persisted.
BEGIN;
ALTER TABLE public.dotation_delivery_transactions
  ADD COLUMN signature_path text,
  ADD COLUMN signed_at timestamptz,
  ADD COLUMN acceptance_version text,
  ADD COLUMN signature_source text CHECK (signature_source IN ('mobile', 'local')),
  ADD COLUMN signature_revision bigint NOT NULL DEFAULT 0;

CREATE SCHEMA IF NOT EXISTS dotation_private;
REVOKE ALL ON SCHEMA dotation_private FROM PUBLIC, anon, authenticated;
CREATE TABLE dotation_private.signature_attempts (
  transaction_id uuid NOT NULL REFERENCES public.dotation_delivery_transactions(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  failures integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (transaction_id, ip_hash)
);
ALTER TABLE dotation_private.signature_attempts ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.can_read_dotation_signature(p_transaction_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.dotation_delivery_transactions t WHERE t.id=p_transaction_id
    AND (public.is_super_admin() OR (public.is_company_member(t.company_id) AND EXISTS (
      SELECT 1 FROM public.employee_work_info w WHERE w.employee_id=t.employee_id
      AND w.company_id=t.company_id AND w.is_current AND public.check_center_access(w.company_id,w.operation_center_id)
    ))));
$$;
REVOKE ALL ON FUNCTION public.can_read_dotation_signature(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_dotation_signature(uuid) TO authenticated;

-- Invoker security deliberately keeps the existing company/center RLS in force.
CREATE FUNCTION public.authorize_dotation_signature(p_transaction_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE t public.dotation_delivery_transactions%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.dotation_delivery_transactions WHERE id = p_transaction_id;
  IF auth.uid() IS NULL OR t.id IS NULL OR NOT public.can_read_dotation_signature(t.id) OR NOT (
    public.is_super_admin() OR (public.is_company_member(t.company_id) AND
      (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'dotacion', 'update')))
  ) THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('id', t.id, 'company_id', t.company_id, 'employee_id', t.employee_id,
    'signed', t.signature_url IS NOT NULL OR t.signature_path IS NOT NULL OR t.signed_at IS NOT NULL,
    'source', t.signature_source, 'updated_at', t.updated_at);
END $$;
REVOKE ALL ON FUNCTION public.authorize_dotation_signature(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_dotation_signature(uuid) TO authenticated;

CREATE FUNCTION dotation_private.snapshot(p_transaction_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'company_name', c.name, 'employee_name', concat_ws(' ', e.first_name, e.middle_name, e.last_name, e.second_last_name),
    'delivery_date', t.delivery_date, 'delivered_by', t.delivered_by, 'observations', t.observations,
    'revision', t.signature_revision, 'updated_at', t.updated_at,
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', d.id, 'item_name', d.item_name,
      'quantity', d.quantity, 'size', d.size, 'item_type', d.item_type,
      'delivery_date', d.delivery_date, 'expiration_date', d.expiration_date) ORDER BY d.id)
      FROM public.dotation_deliveries d WHERE d.transaction_id=t.id), '[]'::jsonb))
  FROM public.dotation_delivery_transactions t
  JOIN public.employees_v2 e ON e.id=t.employee_id AND e.company_id=t.company_id
  JOIN public.companies c ON c.id=t.company_id WHERE t.id=p_transaction_id;
$$;

-- Serialize item edits with acceptance, including inserts/deletes. This revision
-- also catches a change followed by a revert while the employee is reviewing.
CREATE FUNCTION dotation_private.touch_delivery() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    UPDATE public.dotation_delivery_transactions SET signature_revision=signature_revision+1 WHERE id=OLD.transaction_id;
  END IF;
  IF TG_OP <> 'DELETE' AND (TG_OP='INSERT' OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id) THEN
    UPDATE public.dotation_delivery_transactions SET signature_revision=signature_revision+1 WHERE id=NEW.transaction_id;
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER dotation_signature_item_revision BEFORE INSERT OR UPDATE OR DELETE ON public.dotation_deliveries
FOR EACH ROW EXECUTE FUNCTION dotation_private.touch_delivery();

CREATE FUNCTION dotation_private.guard_signature() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.signature_source='mobile' AND (NEW.signature_path, NEW.signature_url, NEW.signed_at, NEW.acceptance_version, NEW.signature_source)
    IS DISTINCT FROM (OLD.signature_path, OLD.signature_url, OLD.signed_at, OLD.acceptance_version, OLD.signature_source) THEN
    RAISE EXCEPTION 'La aceptación móvil ya está registrada' USING ERRCODE='23514';
  END IF;
  IF NEW.signature_source='mobile' AND OLD.signature_source IS DISTINCT FROM 'mobile'
    AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Operación reservada al servicio de firma' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER dotation_guard_mobile_signature BEFORE UPDATE ON public.dotation_delivery_transactions
FOR EACH ROW EXECUTE FUNCTION dotation_private.guard_signature();

-- Only the backend calls this, after verifying the HMAC and its expiry.
CREATE FUNCTION public.identify_dotation_signature(p_transaction_id uuid, p_company_id uuid,
  p_employee_id uuid, p_document text, p_ip_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.dotation_delivery_transactions%ROWTYPE; a dotation_private.signature_attempts%ROWTYPE; s jsonb;
BEGIN
  SELECT * INTO t FROM public.dotation_delivery_transactions WHERE id=p_transaction_id AND company_id=p_company_id AND employee_id=p_employee_id;
  IF t.id IS NULL THEN RETURN jsonb_build_object('code','invalid_link'); END IF;
  IF t.signature_url IS NOT NULL OR t.signature_path IS NOT NULL OR t.signed_at IS NOT NULL THEN RETURN jsonb_build_object('code','already_signed'); END IF;
  IF p_ip_hash IS NULL OR length(p_ip_hash)<>64 THEN RETURN jsonb_build_object('code','invalid_identity'); END IF;
  DELETE FROM dotation_private.signature_attempts WHERE window_start < now()-interval '1 day';
  INSERT INTO dotation_private.signature_attempts(transaction_id, ip_hash) VALUES(t.id,p_ip_hash) ON CONFLICT DO NOTHING;
  SELECT * INTO a FROM dotation_private.signature_attempts WHERE transaction_id=t.id AND ip_hash=p_ip_hash FOR UPDATE;
  IF a.window_start < now()-interval '15 minutes' THEN
    UPDATE dotation_private.signature_attempts SET failures=0,window_start=now() WHERE transaction_id=t.id AND ip_hash=p_ip_hash;
    a.failures:=0;
  END IF;
  IF a.failures>=5 THEN RETURN jsonb_build_object('code','rate_limited'); END IF;
  IF p_document IS NULL OR length(p_document)>30 OR NOT EXISTS (
    SELECT 1 FROM public.employees_v2 e WHERE e.id=t.employee_id AND e.company_id=t.company_id
    AND regexp_replace(e.document_number,'[.[:space:]-]','','g')=regexp_replace(p_document,'[.[:space:]-]','','g')
    AND length(regexp_replace(p_document,'[.[:space:]-]','','g'))>0
  ) THEN
    UPDATE dotation_private.signature_attempts SET failures=failures+1 WHERE transaction_id=t.id AND ip_hash=p_ip_hash;
    RETURN jsonb_build_object('code','invalid_identity');
  END IF;
  s:=dotation_private.snapshot(t.id);
  RETURN jsonb_build_object('code','ok','delivery',s,'review_hash',md5(s::text));
END $$;
REVOKE ALL ON FUNCTION public.identify_dotation_signature(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.identify_dotation_signature(uuid,uuid,uuid,text,text) TO service_role;

CREATE FUNCTION public.accept_dotation_signature(p_transaction_id uuid, p_company_id uuid, p_employee_id uuid,
  p_document text, p_ip_hash text, p_review_hash text, p_path text, p_expires_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.dotation_delivery_transactions%ROWTYPE; result jsonb; stamp timestamptz;
BEGIN
  SELECT * INTO t FROM public.dotation_delivery_transactions WHERE id=p_transaction_id FOR UPDATE;
  IF p_expires_at IS NULL OR clock_timestamp()>=p_expires_at THEN RETURN jsonb_build_object('code','expired'); END IF;
  result:=public.identify_dotation_signature(p_transaction_id,p_company_id,p_employee_id,p_document,p_ip_hash);
  IF result->>'code'<>'ok' THEN RETURN result; END IF;
  IF p_review_hash IS NULL OR p_review_hash<>result->>'review_hash' THEN RETURN jsonb_build_object('code','changed'); END IF;
  IF p_path IS NULL OR p_path NOT LIKE t.company_id::text||'/'||t.id::text||'/%'
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='dotation-signatures' AND name=p_path) THEN
    RAISE EXCEPTION 'Firma no disponible' USING ERRCODE='22023';
  END IF;
  stamp:=clock_timestamp();
  UPDATE public.dotation_delivery_transactions SET signature_path=p_path, signed_at=stamp,
    signature_source='mobile', acceptance_version='dotation-received-v1' WHERE id=t.id;
  RETURN jsonb_build_object('code','ok','signed_at',stamp);
END $$;
REVOKE ALL ON FUNCTION public.accept_dotation_signature(uuid,uuid,uuid,text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_dotation_signature(uuid,uuid,uuid,text,text,text,text,timestamptz) TO service_role;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('dotation-signatures','dotation-signatures',false,1048576,ARRAY['image/png']);
CREATE POLICY "Read accessible dotation signatures" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='dotation-signatures' AND EXISTS (SELECT 1 FROM public.dotation_delivery_transactions t
    WHERE t.signature_path=name AND public.can_read_dotation_signature(t.id))
);
CREATE POLICY "Upload authorized local dotation signatures" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='dotation-signatures' AND EXISTS (
    SELECT 1 FROM public.dotation_delivery_transactions t
    WHERE t.id::text=(storage.foldername(name))[2] AND t.company_id::text=(storage.foldername(name))[1]
    AND public.can_read_dotation_signature(t.id)
    AND t.signature_source IS DISTINCT FROM 'mobile'
    AND (public.is_super_admin() OR (public.is_company_member(t.company_id) AND
      (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(),'dotacion','update'))))
  )
);
CREATE POLICY "Clean unattached local dotation signatures" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='dotation-signatures' AND owner_id=auth.uid()::text
  AND NOT EXISTS (SELECT 1 FROM public.dotation_delivery_transactions t WHERE t.signature_path=name)
);

CREATE FUNCTION public.save_local_dotation_signature(p_transaction_id uuid,p_path text,p_updated_at timestamptz)
RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE context jsonb; stamp timestamptz;
BEGIN
  context:=public.authorize_dotation_signature(p_transaction_id);
  IF context->>'source'='mobile' THEN RAISE EXCEPTION 'La entrega ya fue aceptada' USING ERRCODE='23514'; END IF;
  IF p_path IS NULL OR p_path NOT LIKE (context->>'company_id')||'/'||p_transaction_id::text||'/%' THEN
    RAISE EXCEPTION 'Ruta inválida' USING ERRCODE='22023';
  END IF;
  UPDATE public.dotation_delivery_transactions SET signature_path=p_path,signature_url=NULL,
    signed_at=clock_timestamp(),signature_source='local',acceptance_version=NULL
    WHERE id=p_transaction_id AND updated_at=p_updated_at AND signature_source IS DISTINCT FROM 'mobile'
    RETURNING signed_at INTO stamp;
  IF stamp IS NULL THEN RAISE EXCEPTION 'La entrega cambió. Vuelve a abrir el detalle.' USING ERRCODE='40001'; END IF;
  RETURN stamp;
END $$;
REVOKE ALL ON FUNCTION public.save_local_dotation_signature(uuid,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_local_dotation_signature(uuid,text,timestamptz) TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dotation_private FROM PUBLIC, anon, authenticated;
COMMIT;
