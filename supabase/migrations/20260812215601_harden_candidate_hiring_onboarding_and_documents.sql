-- Keep the hiring transaction compatible with installations where
-- candidate_documents.document_type predates the employee document enum.
-- Unknown legacy values fall back to the selection-process category instead
-- of aborting the entire hire.
DO $migration$
DECLARE
  function_definition text;
  original_fragment text := $fragment$
    document.document_type,
    document.document_name,
$fragment$;
  replacement_fragment text := $fragment$
    CASE
      WHEN document.document_type::text = ANY(enum_range(NULL::public.employee_document_type)::text[])
        THEN document.document_type::text::public.employee_document_type
      ELSE 'proceso_seleccion'::public.employee_document_type
    END,
    document.document_name,
$fragment$;
BEGIN
  SELECT pg_get_functiondef('private.complete_candidate_hiring(uuid,jsonb)'::regprocedure)
  INTO function_definition;

  IF strpos(function_definition, original_fragment) = 0 THEN
    RAISE EXCEPTION 'No se encontró el bloque de documentos esperado en complete_candidate_hiring';
  END IF;

  function_definition := replace(function_definition, original_fragment, replacement_fragment);
  EXECUTE function_definition;
END;
$migration$;
