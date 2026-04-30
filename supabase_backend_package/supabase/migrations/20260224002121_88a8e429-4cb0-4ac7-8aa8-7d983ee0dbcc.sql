
-- =============================================
-- FASE 1: Módulo de Capacitaciones - DB & Storage
-- =============================================

-- 1. ALTER TABLE training_courses: agregar columnas faltantes
ALTER TABLE public.training_courses 
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS legal_framework text,
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'borrador',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Change content column from text to jsonb for structured AI content
ALTER TABLE public.training_courses ALTER COLUMN content TYPE jsonb USING content::jsonb;

-- Make created_by NOT NULL (set existing nulls first)
UPDATE public.training_courses SET created_by = (SELECT auth.uid()) WHERE created_by IS NULL;

-- 2. ALTER TABLE training_attendance: agregar signature_data
ALTER TABLE public.training_attendance 
  ADD COLUMN IF NOT EXISTS signature_data text;

-- 3. CREATE TABLE training_access_tokens
CREATE TABLE public.training_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_type text NOT NULL DEFAULT 'solo_link',
  usage_type text NOT NULL DEFAULT 'multiple',
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  requires_evaluation boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. CREATE TABLE training_completions
CREATE TABLE public.training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.training_access_tokens(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees_v2(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  operator_name text NOT NULL,
  operator_cedula text,
  signature_data text NOT NULL,
  ip_address text,
  user_agent text
);

-- 5. CREATE TABLE training_media
CREATE TABLE public.training_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size integer,
  duration integer,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable RLS on new tables
ALTER TABLE public.training_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_media ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for training_access_tokens
-- Authenticated users: full CRUD by company
CREATE POLICY "Users can manage access tokens for their company"
  ON public.training_access_tokens
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- Anon: SELECT to validate tokens
CREATE POLICY "Anon can validate access tokens"
  ON public.training_access_tokens
  FOR SELECT
  TO anon
  USING (is_active = true AND expires_at > now());

-- Anon: UPDATE to increment uses_count
CREATE POLICY "Anon can increment token usage"
  ON public.training_access_tokens
  FOR UPDATE
  TO anon
  USING (is_active = true AND expires_at > now())
  WITH CHECK (is_active = true AND expires_at > now());

-- 8. RLS Policies for training_completions
-- Authenticated users: read by company
CREATE POLICY "Users can read completions for their company"
  ON public.training_completions
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- Authenticated users: delete by company
CREATE POLICY "Users can delete completions for their company"
  ON public.training_completions
  FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- Anon: INSERT completions (public flow)
CREATE POLICY "Anon can insert completions"
  ON public.training_completions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 9. RLS Policies for training_media
CREATE POLICY "Users can manage media for their company courses"
  ON public.training_media
  FOR ALL
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM public.training_courses 
      WHERE company_id IN (SELECT public.get_user_company_ids())
    )
  );

-- Anon: SELECT media (needed for public access flow)
CREATE POLICY "Anon can view media"
  ON public.training_media
  FOR SELECT
  TO anon
  USING (true);

-- 10. Storage bucket for training media
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-media', 'training-media', true)
ON CONFLICT (id) DO NOTHING;

-- 11. Storage RLS policies
CREATE POLICY "Authenticated users can upload training media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'training-media');

CREATE POLICY "Anyone can view training media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'training-media');

CREATE POLICY "Authenticated users can delete training media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'training-media');

-- 12. Anon policy: SELECT on training_courses for public access
CREATE POLICY "Anon can view active courses"
  ON public.training_courses
  FOR SELECT
  TO anon
  USING (is_active = true AND status = 'publicado');

-- 13. Updated_at triggers for new tables (reuse existing function)
CREATE TRIGGER update_training_access_tokens_updated_at
  BEFORE UPDATE ON public.training_access_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
