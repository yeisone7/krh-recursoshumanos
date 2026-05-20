-- Fix: Storage RLS for documents bucket
-- Allow users with custom role permissions on 'empleados' to upload/update/delete documents

-- 1. DROP OLD POLICIES
DROP POLICY IF EXISTS "Admin and RRHH can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin and RRHH can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete documents" ON storage.objects;

-- 2. CREATE UPDATED UPLOAD POLICY
-- Allow: SuperAdmin, Admin, RRHH, or any user with 'empleados' create/update permission
CREATE POLICY "Admin and RRHH can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (
    public.is_super_admin()
    OR (
      public.is_admin_or_rrhh()
      AND EXISTS (
        SELECT 1 FROM public.user_company_assignments uca
        WHERE uca.user_id = auth.uid()
          AND uca.company_id::text = (storage.foldername(name))[1]
      )
    )
    OR (
      public.check_user_permission(auth.uid(), 'empleados', 'create')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
  )
);

-- 3. CREATE UPDATED UPDATE POLICY
CREATE POLICY "Admin and RRHH can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND (
    public.is_super_admin()
    OR (
      public.is_admin_or_rrhh()
      AND EXISTS (
        SELECT 1 FROM public.user_company_assignments uca
        WHERE uca.user_id = auth.uid()
          AND uca.company_id::text = (storage.foldername(name))[1]
      )
    )
    OR (
      public.check_user_permission(auth.uid(), 'empleados', 'create')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
  )
);

-- 4. CREATE UPDATED DELETE POLICY
CREATE POLICY "Admin can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND EXISTS (
        SELECT 1 FROM public.user_company_assignments uca
        WHERE uca.user_id = auth.uid()
          AND uca.company_id::text = (storage.foldername(name))[1]
      )
    )
    OR public.check_user_permission(auth.uid(), 'empleados', 'delete')
  )
);
