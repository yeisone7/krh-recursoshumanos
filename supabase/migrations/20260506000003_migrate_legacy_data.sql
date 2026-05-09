-- Migration Script for Legacy Education and Profession Data
-- Target tables: public.candidates, public.employees, public.employees_v2

DO $$
DECLARE
    v_row_count INT;
BEGIN
    -- 1. Migrate Education Levels
    UPDATE public.candidates c
    SET education_level_id = el.id
    FROM public.education_levels el
    WHERE c.company_id = el.company_id
    AND (
        LOWER(TRIM(c.education_level)) = LOWER(TRIM(el.name))
        OR (LOWER(TRIM(c.education_level)) = 'bachiller' AND LOWER(TRIM(el.name)) = 'bachiller')
        OR (LOWER(TRIM(c.education_level)) = 'tecnico' AND LOWER(TRIM(el.name)) = 'técnico')
        OR (LOWER(TRIM(c.education_level)) = 'tecnologo' AND LOWER(TRIM(el.name)) = 'tecnólogo')
    )
    AND c.education_level_id IS NULL;
    
    -- Update employees (old table)
    UPDATE public.employees e
    SET education_level_id = el.id
    FROM public.education_levels el
    WHERE e.company_id = el.company_id
    AND LOWER(TRIM(e.education_level)) = LOWER(TRIM(el.name))
    AND e.education_level_id IS NULL;

    -- 2. Migrate Professions
    UPDATE public.candidates c
    SET profession_id = p.id
    FROM public.professions p
    WHERE c.company_id = p.company_id
    AND LOWER(TRIM(c.profession)) = LOWER(TRIM(p.name))
    AND c.profession_id IS NULL;

    -- Update employees (old table)
    UPDATE public.employees e
    SET profession_id = p.id
    FROM public.professions p
    WHERE e.company_id = p.company_id
    AND LOWER(TRIM(e.profession)) = LOWER(TRIM(p.name))
    AND e.profession_id IS NULL;

END $$;
