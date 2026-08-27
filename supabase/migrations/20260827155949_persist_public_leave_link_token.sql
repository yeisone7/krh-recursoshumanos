-- Keep the public token encrypted in Supabase Vault so authorized administrators
-- can retrieve the active link without changing the hash-based public validation.
ALTER TABLE public.leave_public_access_tokens
  ADD COLUMN vault_secret_id uuid REFERENCES vault.secrets(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX leave_public_access_tokens_vault_secret_uidx
  ON public.leave_public_access_tokens (vault_secret_id)
  WHERE vault_secret_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_leave_public_link_status(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token public.leave_public_access_tokens%ROWTYPE;
  v_raw_token text;
BEGIN
  IF NOT private.can_manage_leave_public_link(p_company_id) THEN
    RAISE EXCEPTION 'No tienes permiso para administrar el enlace público.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_token
  FROM public.leave_public_access_tokens token
  WHERE token.company_id = p_company_id AND token.is_active
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('active', false, 'token_available', false);
  END IF;

  IF v_token.vault_secret_id IS NOT NULL THEN
    SELECT secret.decrypted_secret INTO v_raw_token
    FROM vault.decrypted_secrets secret
    WHERE secret.id = v_token.vault_secret_id;
  END IF;

  RETURN jsonb_build_object(
    'active', true,
    'id', v_token.id,
    'created_at', v_token.created_at,
    'expires_at', v_token.expires_at,
    'expired', v_token.expires_at IS NOT NULL AND v_token.expires_at <= now(),
    'token_available', v_raw_token IS NOT NULL,
    'token', v_raw_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_leave_public_link(
  p_company_id uuid,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_id uuid;
  v_secret_id uuid;
BEGIN
  IF NOT private.can_manage_leave_public_link(p_company_id) THEN
    RAISE EXCEPTION 'No tienes permiso para administrar el enlace público.' USING ERRCODE = '42501';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'La fecha de vencimiento debe estar en el futuro.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_company_id::text || ':leave-public-link', 0)
  );

  DELETE FROM vault.secrets secret
  USING public.leave_public_access_tokens token
  WHERE token.company_id = p_company_id
    AND token.is_active
    AND token.vault_secret_id = secret.id;

  UPDATE public.leave_public_access_tokens
  SET is_active = false, revoked_at = now(), revoked_by = (SELECT auth.uid())
  WHERE company_id = p_company_id AND is_active;
  DELETE FROM public.leave_public_identity_sessions
  WHERE company_id = p_company_id AND used_at IS NULL;
  DELETE FROM public.leave_public_identity_sessions
  WHERE expires_at < now() - interval '7 days';
  DELETE FROM public.leave_public_access_attempts
  WHERE attempted_at < now() - interval '7 days';

  INSERT INTO public.leave_public_access_tokens (
    company_id, token_hash, expires_at, created_by
  ) VALUES (
    p_company_id,
    extensions.digest(v_raw_token, 'sha256'),
    p_expires_at,
    (SELECT auth.uid())
  ) RETURNING id INTO v_token_id;

  v_secret_id := vault.create_secret(
    v_raw_token,
    'leave-public-token-' || v_token_id::text,
    'Token cifrado del enlace público de permisos'
  );

  UPDATE public.leave_public_access_tokens
  SET vault_secret_id = v_secret_id
  WHERE id = v_token_id;

  RETURN jsonb_build_object(
    'active', true,
    'id', v_token_id,
    'token', v_raw_token,
    'token_available', true,
    'expires_at', p_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_leave_public_link(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT private.can_manage_leave_public_link(p_company_id) THEN
    RAISE EXCEPTION 'No tienes permiso para administrar el enlace público.' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_company_id::text || ':leave-public-link', 0)
  );

  DELETE FROM vault.secrets secret
  USING public.leave_public_access_tokens token
  WHERE token.company_id = p_company_id
    AND token.is_active
    AND token.vault_secret_id = secret.id;

  UPDATE public.leave_public_access_tokens
  SET is_active = false, revoked_at = now(), revoked_by = (SELECT auth.uid())
  WHERE company_id = p_company_id AND is_active;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  DELETE FROM public.leave_public_identity_sessions
  WHERE company_id = p_company_id AND used_at IS NULL;
  DELETE FROM public.leave_public_identity_sessions
  WHERE expires_at < now() - interval '7 days';
  DELETE FROM public.leave_public_access_attempts
  WHERE attempted_at < now() - interval '7 days';
  RETURN v_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.get_leave_public_link_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_leave_public_link(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_leave_public_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leave_public_link_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rotate_leave_public_link(uuid, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_leave_public_link(uuid) TO authenticated, service_role;
