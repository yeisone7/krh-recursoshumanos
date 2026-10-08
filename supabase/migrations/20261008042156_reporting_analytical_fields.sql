-- Fixed analytical expressions remain in the database; the planner never emits SQL.
CREATE FUNCTION report_private.completed_years(birth date, at_date date) RETURNS integer
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT CASE WHEN birth IS NOT NULL AND at_date>=birth THEN extract(year FROM age(at_date,birth))::integer END
$$;
REVOKE ALL ON FUNCTION report_private.completed_years(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION report_private.completed_years(date,date) TO authenticated;

-- Wrap the existing permission-filtered definitions, preserving column order,
-- security_invoker, security_barrier, tenant filters and historical center access.
DO $migration$
DECLARE definition text;
BEGIN
 SELECT regexp_replace(pg_get_viewdef('report_data.employee_employment_cycles'::regclass,true),';\s*$','') INTO definition;
 EXECUTE 'CREATE OR REPLACE VIEW report_data.employee_employment_cycles WITH (security_invoker=true,security_barrier=true) AS SELECT b.*,
   report_private.completed_years(e.birth_date,b.start_date) AS age_at_hire,
   report_private.completed_years(e.birth_date,b.end_date) AS age_at_exit,
   b.cycle_number=1 AS is_first_hire,
   CASE WHEN coalesce(b.end_date,(now() AT TIME ZONE ''America/Bogota'')::date)>=b.start_date THEN coalesce(b.end_date,(now() AT TIME ZONE ''America/Bogota'')::date)-b.start_date END AS tenure_days,
   report_private.completed_years(b.start_date,coalesce(b.end_date,(now() AT TIME ZONE ''America/Bogota'')::date)) AS tenure_years
 FROM ('||definition||') b JOIN public.employees_v2 e ON e.id=b.employee_id AND e.company_id=b.company_id';

 SELECT regexp_replace(pg_get_viewdef('report_data.employees_v2'::regclass,true),';\s*$','') INTO definition;
 EXECUTE 'CREATE OR REPLACE VIEW report_data.employees_v2 WITH (security_invoker=true,security_barrier=true) AS SELECT b.*,
   report_private.completed_years(b.birth_date,(now() AT TIME ZONE ''America/Bogota'')::date) AS age_years,
   CASE WHEN b.birth_date IS NULL OR b.birth_date>(now() AT TIME ZONE ''America/Bogota'')::date THEN ''Sin fecha válida''
     WHEN report_private.completed_years(b.birth_date,(now() AT TIME ZONE ''America/Bogota'')::date)<25 THEN ''Menos de 25''
     WHEN report_private.completed_years(b.birth_date,(now() AT TIME ZONE ''America/Bogota'')::date)<35 THEN ''25 a 34''
     WHEN report_private.completed_years(b.birth_date,(now() AT TIME ZONE ''America/Bogota'')::date)<45 THEN ''35 a 44''
     WHEN report_private.completed_years(b.birth_date,(now() AT TIME ZONE ''America/Bogota'')::date)<55 THEN ''45 a 54'' ELSE ''55 o más'' END AS age_band,
   h.start_date AS first_hire_date,
   report_private.completed_years(b.birth_date,h.start_date) AS age_at_first_hire
 FROM ('||definition||') b LEFT JOIN LATERAL (
   SELECT c.start_date FROM report_data.employee_employment_cycles c WHERE c.company_id=b.company_id AND c.employee_id=b.id AND c.is_first_hire ORDER BY c.start_date,c.id LIMIT 1
 ) h ON true';

 SELECT regexp_replace(pg_get_viewdef('report_data.contracts'::regclass,true),';\s*$','') INTO definition;
 EXECUTE 'CREATE OR REPLACE VIEW report_data.contracts WITH (security_invoker=true,security_barrier=true) AS SELECT b.*,
   b.effective_end_date-(now() AT TIME ZONE ''America/Bogota'')::date AS days_until_end,
   CASE WHEN b.effective_end_date>=b.start_date THEN b.effective_end_date-b.start_date END AS contract_duration_days
 FROM ('||definition||') b';
END $migration$;

REVOKE ALL ON report_data.employees_v2,report_data.employee_employment_cycles,report_data.contracts FROM PUBLIC,anon;
GRANT SELECT ON report_data.employees_v2,report_data.employee_employment_cycles,report_data.contracts TO authenticated;

UPDATE report_private.sources SET fields=fields || '[
 {"key":"age_years","label":"Edad actual (años cumplidos)","type":"number"},
 {"key":"age_band","label":"Rango de edad actual","type":"text"},
 {"key":"first_hire_date","label":"Fecha de primera contratación","type":"date"},
 {"key":"age_at_first_hire","label":"Edad en la primera contratación (años cumplidos)","type":"number"}
]'::jsonb,version=version+1,
 description='Una fila por empleado, activos y retirados. age_years es la edad actual; age_at_first_hire es la edad en la primera contratación registrada y autorizada. Edades desconocidas o fechas inválidas son NULL, nunca cero. birth_date es nacimiento, created_at es creación técnica, no contratación. Para contrataciones por período y centro histórico use employee_employment_cycles con is_first_hire=true; para reingresos use is_first_hire=false. gender usa M, F y O.'
WHERE key='employees_v2';

UPDATE report_private.sources SET fields=fields || '[
 {"key":"age_at_hire","label":"Edad al ingreso (años cumplidos)","type":"number"},
 {"key":"age_at_exit","label":"Edad al retiro (años cumplidos)","type":"number"},
 {"key":"is_first_hire","label":"Es primera contratación","type":"boolean"},
 {"key":"tenure_days","label":"Tiempo transcurrido en la vinculación (días)","type":"number","unit":"days"},
 {"key":"tenure_years","label":"Antigüedad de la vinculación (años cumplidos)","type":"number"}
]'::jsonb,version=version+1,
 description='Una fila por vinculación: primera contratación o reingreso. start_date es ingreso y end_date es retiro; el período de pantalla filtra ingresos (start_date). is_first_hire distingue primera contratación. age_at_hire y age_at_exit son años cumplidos en esas fechas; sin nacimiento válido son NULL. tenure_days y tenure_years abarcan solo esta vinculación, hasta el retiro o hoy en Bogotá si sigue abierta, no suman interrupciones entre reingresos. Los centros corresponden al ingreso. distinct(employee_id) cuenta personas; count(*) cuenta vinculaciones. Para preguntas por retiros filtre end_date explícitamente y no confunda período de ingreso con retiro.'
WHERE key='employee_employment_cycles';

UPDATE report_private.sources SET fields=fields || '[
 {"key":"days_until_end","label":"Días hasta vencimiento (negativo si venció)","type":"number","unit":"days"},
 {"key":"contract_duration_days","label":"Duración prevista del contrato (días transcurridos)","type":"number","unit":"days"}
]'::jsonb,version=version+1,
 description=description||' days_until_end compara el vencimiento con prórrogas frente a hoy en Bogotá; próximos N días requiere >=0 y <=N. Sin vencimiento definido devuelve NULL. Para ingresos use start_date; la fecha predeterminada de pantalla es vencimiento, no ingreso.'
WHERE key='contracts';
NOTIFY pgrst,'reload schema';
