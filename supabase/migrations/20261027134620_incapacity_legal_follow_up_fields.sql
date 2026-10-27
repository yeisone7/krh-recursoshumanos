BEGIN;

ALTER TABLE public.employee_incapacities
  ADD COLUMN rehabilitation_origin text CHECK (rehabilitation_origin IN ('comun', 'laboral')),
  ADD COLUMN rehabilitation_outcome text CHECK (rehabilitation_outcome IN ('favorable', 'desfavorable')),
  ADD COLUMN pcl_percentage numeric CHECK (pcl_percentage >= 0 AND pcl_percentage <= 100),
  ADD COLUMN pcl_origin text CHECK (pcl_origin IN ('comun', 'laboral')),
  ADD COLUMN pcl_diagnosis_codes text[] NOT NULL DEFAULT '{}';

-- Extend existing document permissions without changing company or module checks.
-- Keep all existing document categories, including the renamed 180-day card.
DO $migration$
DECLARE
  p record;
  clause text;
BEGIN
  FOR p IN
    SELECT * FROM pg_policies
    WHERE (schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN ('Incapacity permissions can upload documents',
                        'Incapacity permissions can update documents',
                        'Incapacity permissions can delete documents'))
       OR (schemaname = 'public' AND tablename = 'document_versions'
      AND policyname IN ('Incapacity permissions can insert document versions',
                        'Incapacity permissions can update document versions',
                        'Incapacity permissions can delete document versions'))
  LOOP
    clause := '';
    IF p.qual IS NOT NULL THEN
      clause := clause || ' USING (' || replace(p.qual,
        '''incapacity_capacity_loss_rating''::text',
        '''incapacity_capacity_loss_rating''::text, ''incapacity_540_follow_up''::text') || ')';
    END IF;
    IF p.with_check IS NOT NULL THEN
      clause := clause || ' WITH CHECK (' || replace(p.with_check,
        '''incapacity_capacity_loss_rating''::text',
        '''incapacity_capacity_loss_rating''::text, ''incapacity_540_follow_up''::text') || ')';
    END IF;
    EXECUTE format('ALTER POLICY %I ON %I.%I%s', p.policyname, p.schemaname, p.tablename, clause);
  END LOOP;
END;
$migration$;

COMMIT;
