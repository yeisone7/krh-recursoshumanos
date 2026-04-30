-- =============================================
-- Migración Restaurada: Creación inicial de Tablas de Planes de Capacitación
-- =============================================

CREATE TABLE IF NOT EXISTS public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'borrador',
  budget numeric,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  priority text,
  scheduled_month integer,
  target_areas text[],
  target_participants integer,
  estimated_cost numeric,
  is_completed boolean NOT NULL DEFAULT false,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
