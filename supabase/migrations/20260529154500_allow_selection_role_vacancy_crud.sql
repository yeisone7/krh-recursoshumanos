-- Allow custom role permissions from the selection module to manage vacancies.

DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage vacancies" ON public.vacancies;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection create can insert vacancies" ON public.vacancies;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection update can update vacancies" ON public.vacancies;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection delete can delete vacancies" ON public.vacancies;

CREATE POLICY "Admin RRHH Psicologo and selection create can insert vacancies"
ON public.vacancies
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member(company_id)
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
  )
);

CREATE POLICY "Admin RRHH Psicologo and selection update can update vacancies"
ON public.vacancies
FOR UPDATE
TO authenticated
USING (
  public.is_company_member(company_id)
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
)
WITH CHECK (
  public.is_company_member(company_id)
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);

CREATE POLICY "Admin RRHH Psicologo and selection delete can delete vacancies"
ON public.vacancies
FOR DELETE
TO authenticated
USING (
  public.is_company_member(company_id)
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'delete')
  )
);

DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection create can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection update can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection delete can delete candidates" ON public.candidates;

CREATE POLICY "Admin RRHH Psicologo and selection create can insert candidates"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
  )
);

CREATE POLICY "Admin RRHH Psicologo and selection update can update candidates"
ON public.candidates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);

CREATE POLICY "Admin RRHH Psicologo and selection delete can delete candidates"
ON public.candidates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'delete')
  )
);

DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection create can insert selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection update can update selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Admin RRHH Psicologo and selection delete can delete selection steps" ON public.selection_steps;

CREATE POLICY "Admin RRHH Psicologo and selection create can insert selection steps"
ON public.selection_steps
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
  )
);

CREATE POLICY "Admin RRHH Psicologo and selection update can update selection steps"
ON public.selection_steps
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);

CREATE POLICY "Admin RRHH Psicologo and selection delete can delete selection steps"
ON public.selection_steps
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'delete')
  )
);

DROP POLICY IF EXISTS "Selection permissions can upload vacancy documents" ON storage.objects;
CREATE POLICY "Selection permissions can upload vacancy documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'vacancies'
  AND EXISTS (
    SELECT 1
    FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);

DROP POLICY IF EXISTS "Selection permissions can update vacancy documents" ON storage.objects;
CREATE POLICY "Selection permissions can update vacancy documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'vacancies'
  AND EXISTS (
    SELECT 1
    FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'vacancies'
  AND EXISTS (
    SELECT 1
    FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);
