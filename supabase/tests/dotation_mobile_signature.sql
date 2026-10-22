-- Always rolls back fixtures. Can be preceded by the migration inside this transaction.
BEGIN;
DO $$
DECLARE c uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); t uuid:=gen_random_uuid();
  u uuid:=gen_random_uuid(); center_id uuid:=gen_random_uuid(); other_center uuid:=gen_random_uuid();
  item uuid:=gen_random_uuid(); result jsonb; review text; path text; i integer;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  VALUES(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',u||'@signature-test.invalid','',now(),'{}','{}',now(),now());
  INSERT INTO public.companies(id,name,nit) VALUES(c,'Firma QA',c::text);
  INSERT INTO public.operation_centers(id,company_id,name,code) VALUES(center_id,c,'Centro QA','A'),(other_center,c,'Otro centro QA','B');
  INSERT INTO public.employees_v2(id,company_id,document_type,document_number,first_name,last_name,is_active,status)
  VALUES(e,c,'CC','987654321','Firma','Prueba',true,'active');
  INSERT INTO public.employee_work_info(employee_id,company_id,operation_center_id,position_name,hire_date,is_current)
  VALUES(e,c,center_id,'Auxiliar',current_date,true);
  INSERT INTO public.user_company_assignments(user_id,company_id) VALUES(u,c);
  INSERT INTO public.user_roles(user_id,role) VALUES(u,'rrhh');
  INSERT INTO public.user_center_assignments(user_id,operation_center_id) VALUES(u,other_center);
  INSERT INTO public.system_config(company_id,config_key,config_value) VALUES(c,'dotation_inventory_enabled','{"enabled":false}');
  INSERT INTO public.dotation_delivery_transactions(id,company_id,employee_id,delivery_date) VALUES(t,c,e,current_date);
  INSERT INTO public.dotation_deliveries(id,company_id,employee_id,transaction_id,item_type,item_name,quantity,delivery_date,expiration_date)
  VALUES(item,c,e,t,'otros','Camisa QA',1,current_date,current_date+120);
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  ASSERT NOT public.can_read_dotation_signature(t),'other center may not read';
  BEGIN
    PERFORM public.authorize_dotation_signature(t);
    RAISE EXCEPTION 'Unauthorized center was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  UPDATE public.user_center_assignments SET operation_center_id=center_id WHERE user_id=u;
  SET LOCAL ROLE authenticated;
  result:=public.authorize_dotation_signature(t);
  ASSERT result->>'id'=t::text AND result->>'signed'='false','authorized generation';
  BEGIN
    PERFORM public.authorize_dotation_signature(gen_random_uuid());
    RAISE EXCEPTION 'Missing transaction was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  ASSERT NOT has_function_privilege('anon','public.identify_dotation_signature(uuid,uuid,uuid,text,text)','execute'),'no direct public identification';
  ASSERT NOT has_function_privilege('authenticated','public.accept_dotation_signature(uuid,uuid,uuid,text,text,text,text,timestamptz)','execute'),'no direct public acceptance';
  ASSERT (SELECT NOT public FROM storage.buckets WHERE id='dotation-signatures'),'private storage';
  result:=public.identify_dotation_signature(t,gen_random_uuid(),e,'987654321',repeat('a',64));
  ASSERT result->>'code'='invalid_link','company binding';
  result:=public.identify_dotation_signature(t,c,gen_random_uuid(),'987654321',repeat('a',64));
  ASSERT result->>'code'='invalid_link','employee binding';
  FOR i IN 1..5 LOOP
    result:=public.identify_dotation_signature(t,c,e,'wrong',repeat('a',64));
    ASSERT result->>'code'='invalid_identity','incorrect ID';
    ASSERT NOT result ? 'delivery','no data before identification';
  END LOOP;
  result:=public.identify_dotation_signature(t,c,e,'987654321',repeat('a',64));
  ASSERT result->>'code'='rate_limited','rate limiting';
  UPDATE dotation_private.signature_attempts SET window_start=now()-interval '16 minutes';
  result:=public.identify_dotation_signature(t,c,e,'987.654.321',repeat('a',64));
  ASSERT result->>'code'='ok','normalized ID accepted after window';
  ASSERT jsonb_array_length(result->'delivery'->'items')=1,'review includes items';
  review:=result->>'review_hash';
  UPDATE public.dotation_deliveries SET quantity=2 WHERE id=item;
  result:=public.accept_dotation_signature(t,c,e,'987654321',repeat('a',64),review,'missing',now()+interval '1 hour');
  ASSERT result->>'code'='changed','item edit invalidates review';
  result:=public.identify_dotation_signature(t,c,e,'987654321',repeat('a',64));
  review:=result->>'review_hash';
  path:=c||'/'||t||'/test.png';
  INSERT INTO storage.objects(bucket_id,name) VALUES('dotation-signatures',path);
  result:=public.accept_dotation_signature(t,c,e,'987654321',repeat('a',64),review,path,now()-interval '1 second');
  ASSERT result->>'code'='expired','expiry rechecked at commit';
  result:=public.accept_dotation_signature(t,c,e,'987654321',repeat('a',64),review,path,now()+interval '1 hour');
  ASSERT result->>'code'='ok','first acceptance succeeds';
  ASSERT (SELECT signature_path=path AND signed_at IS NOT NULL AND acceptance_version='dotation-received-v1' AND signature_source='mobile' FROM public.dotation_delivery_transactions WHERE id=t),'acceptance persisted';
  result:=public.accept_dotation_signature(t,c,e,'987654321',repeat('a',64),review,path,now()+interval '1 hour');
  ASSERT result->>'code'='already_signed','duplicate blocked';
  BEGIN
    UPDATE public.dotation_delivery_transactions SET signature_path=NULL,signed_at=NULL,signature_source=NULL WHERE id=t;
    RAISE EXCEPTION 'Existing mobile acceptance overwritten';
  EXCEPTION WHEN check_violation THEN NULL; END;
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*)=1 FROM storage.objects WHERE bucket_id='dotation-signatures' AND name=path),'authorized private image access';
  RESET ROLE;
  UPDATE public.user_center_assignments SET operation_center_id=other_center WHERE user_id=u;
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*)=0 FROM storage.objects WHERE bucket_id='dotation-signatures' AND name=path),'other center cannot access image';
  RESET ROLE;
END $$;
SELECT 'Dotation mobile signature: all assertions passed' AS result;
ROLLBACK;
