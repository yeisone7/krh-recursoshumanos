-- Catalog + sequence are committed together. SECURITY INVOKER retains table RLS
-- and the existing payroll catalog guards for used cycles.
CREATE OR REPLACE FUNCTION public.save_shift_cycle(
  p_company_id uuid, p_cycle_id uuid, p_values jsonb, p_days jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved public.shift_cycles%ROWTYPE; item jsonb; cycle_id uuid; n integer; k text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sin sesión autorizada' USING ERRCODE='42501'; END IF;
  IF p_values IS NULL OR jsonb_typeof(p_values)<>'object' THEN RAISE EXCEPTION 'Datos de ciclo inválidos' USING ERRCODE='22023'; END IF;
  FOR k IN SELECT jsonb_object_keys(p_values) LOOP
    IF k<>ALL(ARRAY['name','code','description','is_active','total_days']) THEN RAISE EXCEPTION 'Campo no editable: %',k USING ERRCODE='22023'; END IF;
  END LOOP;
  IF p_days IS NOT NULL THEN
    IF jsonb_typeof(p_days)<>'array' OR jsonb_array_length(p_days)=0 THEN RAISE EXCEPTION 'Agrega al menos un día al ciclo' USING ERRCODE='22023'; END IF;
    n:=jsonb_array_length(p_days);
    IF (SELECT count(DISTINCT (value->>'day_number')::integer) FROM jsonb_array_elements(p_days))<>n
       OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_days) WHERE (value->>'day_number')::integer NOT BETWEEN 1 AND n OR value->>'day_number' IS NULL)
    THEN RAISE EXCEPTION 'La secuencia debe contener los días 1 a % sin duplicados',n USING ERRCODE='22023'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_days) LOOP
      IF NOT EXISTS(SELECT 1 FROM public.shifts WHERE id=(item->>'shift_id')::uuid AND company_id=p_company_id AND kind='day' AND is_active)
      THEN RAISE EXCEPTION 'Selecciona Turnos Día activos de la empresa actual' USING ERRCODE='22023'; END IF;
    END LOOP;
  END IF;
  IF p_cycle_id IS NULL THEN
    IF p_days IS NULL OR nullif(btrim(p_values->>'name'),'') IS NULL THEN RAISE EXCEPTION 'Indica nombre y días del ciclo' USING ERRCODE='22023'; END IF;
    INSERT INTO public.shift_cycles(company_id,name,code,description,total_days,is_active,created_by)
    VALUES(p_company_id,btrim(p_values->>'name'),p_values->>'code',p_values->>'description',n,coalesce((p_values->>'is_active')::boolean,true),auth.uid()) RETURNING * INTO saved;
  ELSE
    SELECT * INTO saved FROM public.shift_cycles WHERE id=p_cycle_id AND company_id=p_company_id FOR UPDATE;
    IF saved.id IS NULL THEN RAISE EXCEPTION 'Ciclo inexistente o sin permisos' USING ERRCODE='42501'; END IF;
    IF p_values ? 'name' AND nullif(btrim(p_values->>'name'),'') IS NULL THEN RAISE EXCEPTION 'Indica el nombre del ciclo' USING ERRCODE='22023'; END IF;
    UPDATE public.shift_cycles SET
      name=CASE WHEN p_values ? 'name' THEN btrim(p_values->>'name') ELSE saved.name END,
      code=CASE WHEN p_values ? 'code' THEN p_values->>'code' ELSE saved.code END,
      description=CASE WHEN p_values ? 'description' THEN p_values->>'description' ELSE saved.description END,
      is_active=CASE WHEN p_values ? 'is_active' THEN (p_values->>'is_active')::boolean ELSE saved.is_active END,
      total_days=coalesce(n,saved.total_days)
    WHERE id=p_cycle_id AND company_id=p_company_id RETURNING * INTO saved;
    IF saved.id IS NULL THEN RAISE EXCEPTION 'Sin permisos para modificar el ciclo' USING ERRCODE='42501'; END IF;
  END IF;
  cycle_id:=saved.id;
  IF p_days IS NOT NULL THEN
    DELETE FROM public.shift_cycle_days WHERE shift_cycle_id=cycle_id AND company_id=p_company_id;
    IF EXISTS(SELECT 1 FROM public.shift_cycle_days WHERE shift_cycle_id=cycle_id) THEN RAISE EXCEPTION 'Sin permisos para modificar la secuencia' USING ERRCODE='42501'; END IF;
    INSERT INTO public.shift_cycle_days(company_id,shift_cycle_id,day_number,shift_id)
    SELECT p_company_id,cycle_id,(value->>'day_number')::integer,(value->>'shift_id')::uuid FROM jsonb_array_elements(p_days);
  END IF;
  RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.save_shift_cycle(uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_shift_cycle(uuid,uuid,jsonb,jsonb) TO authenticated;
