-- =============================================
-- Migración Restaurada: Creación inicial de Tablas de Capacitación
-- =============================================

-- 1. CREATE ENUMS
DO $$ BEGIN
    CREATE TYPE public.attendance_status AS ENUM ('inscrito', 'asistio', 'no_asistio', 'justificado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.training_modality AS ENUM ('presencial', 'virtual', 'mixto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.training_status AS ENUM ('programado', 'en_curso', 'completado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CREATE training_courses
CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  category text NOT NULL,
  description text,
  modality public.training_modality NOT NULL DEFAULT 'presencial',
  duration_hours integer NOT NULL DEFAULT 0,
  is_mandatory boolean NOT NULL DEFAULT false,
  requires_certification boolean NOT NULL DEFAULT false,
  validity_months integer,
  target_audience text,
  prerequisites text,
  objectives text,
  provider text,
  content text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. CREATE training_sessions
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  session_code text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  instructor_id uuid,
  instructor_name text,
  location text,
  max_participants integer,
  status public.training_status NOT NULL DEFAULT 'programado',
  observations text,
  materials_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. CREATE training_attendance
CREATE TABLE IF NOT EXISTS public.training_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  attendance_status public.attendance_status NOT NULL DEFAULT 'inscrito',
  enrollment_date date NOT NULL DEFAULT CURRENT_DATE,
  attendance_date date,
  score numeric,
  passed boolean,
  observations text,
  enrolled_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
