-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- RLS Policies for documents bucket

-- Policy: Users can view documents from their company's employees
CREATE POLICY "Users can view company documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (
    -- Extract company_id from path structure: documents/{company_id}/{entity_type}/{entity_id}/{filename}
    EXISTS (
      SELECT 1 FROM public.user_company_assignments uca
      WHERE uca.user_id = auth.uid()
        AND uca.company_id::text = (storage.foldername(name))[1]
    )
    OR public.is_admin()
  )
);

-- Policy: Admin and RRHH can upload documents
CREATE POLICY "Admin and RRHH can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_admin_or_rrhh()
  AND EXISTS (
    SELECT 1 FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Admin and RRHH can update documents
CREATE POLICY "Admin and RRHH can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND public.is_admin_or_rrhh()
  AND EXISTS (
    SELECT 1 FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Only admin can delete documents (soft delete preferred, but allow for cleanup)
CREATE POLICY "Admin can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND public.is_admin()
  AND EXISTS (
    SELECT 1 FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
);

-- Create a documents metadata table for versioning and audit trail
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'contract', 'contract_extension', 'medical_exam', 'dotation'
  entity_id UUID NOT NULL,
  company_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents from their company
CREATE POLICY "Users can view company document versions"
ON public.document_versions FOR SELECT
USING (
  public.is_company_member(company_id)
  OR public.is_admin()
);

-- Policy: Admin and RRHH can insert document versions
CREATE POLICY "Admin and RRHH can insert document versions"
ON public.document_versions FOR INSERT
WITH CHECK (
  public.is_admin_or_rrhh()
  AND public.is_company_member(company_id)
);

-- Policy: Admin and RRHH can update document versions (for marking as non-current)
CREATE POLICY "Admin and RRHH can update document versions"
ON public.document_versions FOR UPDATE
USING (
  public.is_admin_or_rrhh()
  AND public.is_company_member(company_id)
);

-- Create index for fast lookups
CREATE INDEX idx_document_versions_entity ON public.document_versions(entity_type, entity_id);
CREATE INDEX idx_document_versions_company ON public.document_versions(company_id);
CREATE INDEX idx_document_versions_current ON public.document_versions(entity_type, entity_id, is_current) WHERE is_current = true;