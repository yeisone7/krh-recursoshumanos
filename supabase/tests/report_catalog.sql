BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT user_id::text FROM public.super_admins LIMIT 1),true);
SELECT set_config('report.test_company',gen_random_uuid()::text,true);
INSERT INTO public.companies(id,name,nit) VALUES(current_setting('report.test_company')::uuid,'Report catalog test',current_setting('report.test_company'));
SET LOCAL ROLE authenticated;
DO $$
DECLARE s record;p jsonb;r jsonb;run_id uuid;c uuid:=current_setting('report.test_company')::uuid;
BEGIN
 PERFORM public.ai_report_library(c);
 FOR s IN SELECT * FROM report_private.sources LOOP
  p:=jsonb_build_object('source',s.key,'columns','[]'::jsonb,'dimensions','[]'::jsonb,'metrics','[{"field":"*","op":"count","key":"total"}]'::jsonb,'filters','[]'::jsonb,'related','[]'::jsonb,'order','[]'::jsonb,'chart','none','limit',null,'comparePrevious',false);
  r:=report_private.query(c,p,CASE WHEN s.key='training_compliance' THEN '{"startDate":"2026-10-01","endDate":"2026-10-31"}'::jsonb ELSE '{}'::jsonb END);
  IF r->>'totalRows'<>'1' THEN RAISE EXCEPTION 'Aggregate source failed %',s.key; END IF;
  IF s.key<>'training_compliance' THEN
   p:=p||jsonb_build_object('columns',jsonb_build_array(s.fields->0->>'key'),'metrics','[]'::jsonb,'limit',1);
   PERFORM report_private.query(c,p,'{}');
  END IF;
 END LOOP;
 p:='{"source":"employees_v2","columns":[],"dimensions":[],"metrics":[{"field":"*","op":"count","key":"total"}],"filters":[],"related":[],"order":[],"chart":"none","limit":null,"comparePrevious":false}';
 run_id:=public.create_ai_report(c,p,'{}','Prueba transaccional','Prueba','test');
 r:=public.get_ai_report(c,run_id);
 IF r->>'id' IS NULL THEN RAISE EXCEPTION 'Missing persisted result'; END IF;
 PERFORM public.ai_report_library(c,'favorite',run_id);
 RAISE NOTICE 'PASS: all sources list/aggregate, library, persist, read, favorite';
END $$;
RESET ROLE;


SELECT 'PASS: 121 registered sources list/aggregate, report library, saved result and favorites' AS result;
ROLLBACK;
