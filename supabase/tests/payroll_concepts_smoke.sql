-- Requires an existing superadmin and employee with a dated operation center.
-- Every fixture and change is rolled back.
BEGIN;

DO $$
DECLARE actor uuid; cfg public.payroll_labor_config; employee uuid; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); concepts jsonb; result jsonb; nid uuid; other_c uuid; copied public.payroll_novelties; errors integer:=0;
BEGIN
 SELECT user_id INTO actor FROM public.super_admins LIMIT 1;
 IF actor IS NULL THEN RAISE EXCEPTION 'Test requires existing superadmin'; END IF;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 SELECT * INTO cfg FROM public.payroll_labor_config cfg0 WHERE EXISTS (SELECT 1 FROM public.employees_v2 e WHERE e.company_id=cfg0.company_id AND payroll_private.employee_center(e.company_id,e.id,NULL,current_date+1) IS NOT NULL AND payroll_private.employee_center(e.company_id,e.id,NULL,current_date+2) IS NOT NULL) ORDER BY company_id LIMIT 1;
 SELECT e.id INTO employee FROM public.employees_v2 e WHERE e.company_id=cfg.company_id AND payroll_private.employee_center(e.company_id,e.id,NULL,current_date+1) IS NOT NULL AND payroll_private.employee_center(e.company_id,e.id,NULL,current_date+2) IS NOT NULL LIMIT 1;
 SELECT id INTO other_c FROM public.companies WHERE id<>cfg.company_id LIMIT 1;
 concepts:=public.list_payroll_concepts(cfg.company_id);
 IF jsonb_array_length(concepts)<8 THEN RAISE EXCEPTION 'Eight migrated concepts expected'; END IF;
 IF (SELECT percentage FROM public.payroll_concepts WHERE company_id=cfg.company_id AND system_type='festivo_trabajado')<>cfg.surcharge_festivo THEN RAISE EXCEPTION 'Original festivo rate changed'; END IF;
 concepts:=concepts || jsonb_build_array(
 jsonb_build_object('id',a,'name','QA Horas','identifier','QA_H','unit','hours','percentage',12.5,'is_active',true,'system_type',NULL,'sort_order',8),
 jsonb_build_object('id',b,'name','QA Días','identifier','QA_D','unit','days','percentage',0,'is_active',true,'system_type',NULL,'sort_order',9));
 result:=public.save_payroll_settings(cfg.company_id,'{}',concepts,cfg.updated_at);
 cfg:=jsonb_populate_record(cfg,result);
 IF (SELECT percentage FROM public.payroll_concepts WHERE id=a)<>12.5 THEN RAISE EXCEPTION 'Decimal rate lost'; END IF;
 BEGIN
 PERFORM public.save_payroll_settings(cfg.company_id,'{}',concepts,cfg.updated_at - interval '1 second');
 RAISE EXCEPTION 'Stale save accepted';
 EXCEPTION WHEN serialization_failure THEN errors:=errors+1; END;
 BEGIN
 PERFORM public.save_payroll_settings(cfg.company_id,'{}',concepts||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'name','Duplicate','identifier',' qa_h ','unit','hours','percentage',0,'is_active',true,'system_type',NULL,'sort_order',10)),cfg.updated_at);
 RAISE EXCEPTION 'Duplicate identifier accepted';
 EXCEPTION WHEN unique_violation THEN errors:=errors+1; END;
 BEGIN
 UPDATE public.payroll_concepts SET company_id=other_c WHERE id=a;
 RAISE EXCEPTION 'Reassigned company accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Reassigned company accepted' THEN RAISE; END IF; errors:=errors+1; END;
 BEGIN
 PERFORM public.payroll_correction_write(cfg.company_id,jsonb_build_array(jsonb_build_object('module','novedades','action','create','values',jsonb_build_object('employee_id',employee,'novelty_date',current_date+1,'novelty_type','custom','concept_id',(SELECT id FROM public.payroll_concepts WHERE company_id=other_c LIMIT 1),'quantity',1,'quantity_unit','hours'))),NULL,false);
 RAISE EXCEPTION 'Cross-company concept accepted';
 EXCEPTION WHEN invalid_parameter_value THEN errors:=errors+1; END;
 result:=public.payroll_correction_write(cfg.company_id,jsonb_build_array(jsonb_build_object('module','novedades','action','create','values',jsonb_build_object('employee_id',employee,'novelty_date',current_date+1,'novelty_type','custom','concept_id',a,'quantity',3,'quantity_unit','hours','hours',3))),NULL,false);
 SELECT id INTO nid FROM public.payroll_novelties WHERE concept_id=a;
 PERFORM public.payroll_correction_write(cfg.company_id,jsonb_build_array(jsonb_build_object('module','novedades','action','approve','id',nid,'values',jsonb_build_object('status','aprobada'))),NULL,false);
 result:=public.payroll_correction_write(cfg.company_id,jsonb_build_array(jsonb_build_object('module','novedades','action','create','values',jsonb_build_object('employee_id',employee,'novelty_date',current_date+1,'novelty_type','custom','concept_id',b,'quantity',2,'quantity_unit','days','hours',0))),NULL,false);
 SELECT * INTO copied FROM public.payroll_novelties WHERE concept_id=b;
 IF copied.quantity<>2 OR copied.hours<>2*cfg.daily_hours OR copied.quantity_unit<>'days' THEN RAISE EXCEPTION 'Days conversion failed'; END IF;
 UPDATE public.payroll_concepts SET is_active=false WHERE id=b;
 PERFORM public.payroll_correction_write(cfg.company_id,jsonb_build_array(jsonb_build_object('module','novedades','action','update','id',copied.id,'values',jsonb_build_object('quantity',1.5,'quantity_unit','days'))),NULL,false);
 BEGIN
 PERFORM public.payroll_correction_write(cfg.company_id,jsonb_build_array(jsonb_build_object('module','novedades','action','create','values',jsonb_build_object('employee_id',employee,'novelty_date',current_date+2,'novelty_type','custom','concept_id',b,'quantity',1,'quantity_unit','days'))),NULL,false);
 RAISE EXCEPTION 'Inactive concept accepted';
 EXCEPTION WHEN invalid_parameter_value THEN errors:=errors+1; END;
 BEGIN
 UPDATE public.payroll_concepts SET unit='hours' WHERE id=b;
 RAISE EXCEPTION 'Used unit accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Used unit accepted' THEN RAISE; END IF; errors:=errors+1; END;
 BEGIN
 DELETE FROM public.payroll_concepts WHERE id=b;
 RAISE EXCEPTION 'Used delete accepted';
 EXCEPTION WHEN foreign_key_violation THEN errors:=errors+1; END;
 BEGIN
 PERFORM public.payroll_correction_write(cfg.company_id,jsonb_build_array(jsonb_build_object('module','novedades','action','create','values',jsonb_build_object('employee_id',employee,'novelty_date',current_date+1,'novelty_type','custom','concept_id',a,'quantity',3,'quantity_unit','hours'))),NULL,false);
 RAISE EXCEPTION 'Duplicate custom novelty accepted';
 EXCEPTION WHEN unique_violation THEN errors:=errors+1; END;
 UPDATE public.payroll_labor_config SET daily_hours=cfg.daily_hours+1 WHERE id=cfg.id;
 PERFORM public.payroll_correction_write(cfg.company_id,jsonb_build_array(jsonb_build_object('module','novedades','action','approve','id',copied.id,'values',jsonb_build_object('status','aprobada'))),NULL,false);
 IF (SELECT quantity FROM public.payroll_novelties WHERE id=copied.id)<>1.5 THEN RAISE EXCEPTION 'Original days changed'; END IF;
 -- A forged identity has no company/module permissions.
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 BEGIN
 PERFORM public.save_payroll_settings(cfg.company_id,'{}',concepts,cfg.updated_at);
 RAISE EXCEPTION 'Unauthorized save accepted';
 EXCEPTION WHEN insufficient_privilege THEN errors:=errors+1; END;
 IF errors<>9 THEN RAISE EXCEPTION 'Expected 9 denied operations, got %',errors; END IF;
END $$;
SELECT 'migration, preservation, atomic save, quantity, corrections, lifecycle, duplicates and permission checks passed' AS result;

ROLLBACK;
