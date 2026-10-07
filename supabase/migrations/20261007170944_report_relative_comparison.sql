CREATE OR REPLACE FUNCTION public.create_ai_report(p_company_id uuid,p_plan jsonb,p_filters jsonb,p_question text,p_title text,p_provider text,p_parent_id uuid DEFAULT NULL,p_context jsonb DEFAULT '[]') RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET statement_timeout='25s' AS $$
DECLARE result_data jsonb;previous_data jsonb;previous_filters jsonb;previous_plan jsonb;start_day date;end_day date;date_key text;
BEGIN
 result_data:=report_private.query(p_company_id,p_plan,p_filters);
 IF (p_plan->>'comparePrevious')::boolean THEN
  IF jsonb_array_length(p_plan->'metrics')=0 THEN RAISE EXCEPTION 'CLARIFICATION: Selecciona una métrica para comparar';END IF;
  SELECT date_field INTO date_key FROM report_private.sources WHERE key=p_plan->>'source';
  start_day:=(p_filters->>'startDate')::date;end_day:=(p_filters->>'endDate')::date;
  -- Relative language remains in the definition. Only this execution resolves its dates.
  IF start_day IS NULL THEN SELECT max((f->'values'->>0)::date) INTO start_day FROM jsonb_array_elements(p_plan->'filters') f WHERE f->>'field'=date_key AND f->>'op' IN ('gte','eq');END IF;
  IF end_day IS NULL THEN SELECT min((f->'values'->>0)::date) INTO end_day FROM jsonb_array_elements(p_plan->'filters') f WHERE f->>'field'=date_key AND f->>'op' IN ('lte','eq');END IF;
  IF start_day IS NULL OR end_day IS NULL OR end_day<start_day THEN RAISE EXCEPTION 'CLARIFICATION: Define un periodo con inicio y fin para comparar';END IF;
  previous_filters:=p_filters||jsonb_build_object('startDate',CASE WHEN start_day=date_trunc('month',start_day)::date AND end_day=(start_day+interval '1 month'-interval '1 day')::date THEN (start_day-interval '1 month')::date ELSE start_day-(end_day-start_day+1) END,'endDate',start_day-1);
  previous_plan:=jsonb_set(p_plan,'{filters}',(SELECT coalesce(jsonb_agg(f),'[]') FROM jsonb_array_elements(p_plan->'filters') f WHERE f->>'field'<>date_key));
  previous_data:=report_private.query(p_company_id,previous_plan,previous_filters);
  result_data:=result_data||jsonb_build_object('comparison',jsonb_build_object('startDate',previous_filters->>'startDate','endDate',previous_filters->>'endDate','rows',previous_data->'rows','totalRows',previous_data->'totalRows'));
 END IF;
 RETURN report_private.store_run(p_company_id,p_plan,p_filters,p_question,p_title,p_provider,p_parent_id,result_data,p_context);
END $$;
