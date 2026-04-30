-- Create enum for vacancy status
CREATE TYPE public.vacancy_status AS ENUM ('open', 'in_process', 'closed', 'cancelled');

-- Create enum for vacancy type (recruitment type)
CREATE TYPE public.vacancy_type AS ENUM ('internal', 'external', 'both');

-- Create enum for vacancy reason
CREATE TYPE public.vacancy_reason AS ENUM ('new_position', 'replacement', 'growth', 'temporary', 'other');

-- Create enum for candidate status
CREATE TYPE public.candidate_status AS ENUM (
  'applied',
  'in_interview',
  'in_psycho_test',
  'in_technical_test',
  'in_validation',
  'in_medical',
  'selected',
  'not_selected',
  'withdrawn',
  'hired'
);

-- Create enum for selection step type
CREATE TYPE public.selection_step_type AS ENUM (
  'initial_interview',
  'psycho_test',
  'technical_test',
  'background_check',
  'academic_validation',
  'reference_check',
  'financial_check',
  'medical_exam',
  'final_interview',
  'offer'
);

-- Create enum for selection step status
CREATE TYPE public.selection_step_status AS ENUM ('pending', 'scheduled', 'completed', 'passed', 'failed', 'skipped');

-- =====================
-- VACANCIES TABLE
-- =====================
CREATE TABLE public.vacancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id UUID REFERENCES public.operation_centers(id) ON DELETE SET NULL,
  
  -- Position details
  position_title TEXT NOT NULL,
  department_area TEXT,
  shift_type TEXT DEFAULT 'oficina', -- oficina, turnos, mixto
  positions_count INTEGER NOT NULL DEFAULT 1,
  
  -- Vacancy details
  vacancy_type public.vacancy_type NOT NULL DEFAULT 'external',
  vacancy_reason public.vacancy_reason NOT NULL DEFAULT 'new_position',
  reason_details TEXT,
  
  -- Compensation
  salary_range_min NUMERIC,
  salary_range_max NUMERIC,
  salary_type TEXT DEFAULT 'mensual',
  includes_transport BOOLEAN DEFAULT true,
  other_benefits TEXT,
  
  -- Description
  job_description TEXT,
  requirements TEXT,
  experience_years INTEGER DEFAULT 0,
  education_level TEXT,
  
  -- Assignment
  psychologist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hiring_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dates
  open_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_close_date DATE,
  actual_close_date DATE,
  
  -- Publication
  publication_platforms TEXT[], -- array of platform names
  
  -- Status
  status public.vacancy_status NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  observations TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vacancies
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vacancies
CREATE POLICY "Users can view vacancies from their company"
ON public.vacancies FOR SELECT
USING (
  public.is_company_member(company_id)
  OR public.is_admin()
);

CREATE POLICY "Admin RRHH and Psicologo can manage vacancies"
ON public.vacancies FOR ALL
USING (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND public.is_company_member(company_id)
)
WITH CHECK (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND public.is_company_member(company_id)
);

-- Create indexes for vacancies
CREATE INDEX idx_vacancies_company ON public.vacancies(company_id);
CREATE INDEX idx_vacancies_status ON public.vacancies(status);
CREATE INDEX idx_vacancies_center ON public.vacancies(operation_center_id);

-- Trigger for updated_at
CREATE TRIGGER update_vacancies_updated_at
  BEFORE UPDATE ON public.vacancies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- CANDIDATES TABLE
-- =====================
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  
  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  document_type public.document_type NOT NULL DEFAULT 'CC',
  document_number TEXT NOT NULL,
  
  -- Contact
  email TEXT,
  phone TEXT,
  mobile TEXT,
  
  -- Location
  address TEXT,
  city TEXT,
  department TEXT,
  
  -- Demographics
  birth_date DATE,
  gender TEXT,
  
  -- Professional
  education_level TEXT,
  profession TEXT,
  experience_years INTEGER DEFAULT 0,
  current_company TEXT,
  current_position TEXT,
  salary_expectation NUMERIC,
  
  -- Application
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT, -- how they found the vacancy
  cv_url TEXT,
  
  -- Status tracking
  status public.candidate_status NOT NULL DEFAULT 'applied',
  current_step public.selection_step_type,
  
  -- Evaluation
  general_notes TEXT,
  strengths TEXT,
  weaknesses TEXT,
  final_score NUMERIC,
  final_concept TEXT,
  
  -- Result
  is_selected BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- if hired
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on candidates
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidates
CREATE POLICY "Users can view candidates from their company vacancies"
ON public.candidates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
  OR public.is_admin()
);

CREATE POLICY "Admin RRHH and Psicologo can manage candidates"
ON public.candidates FOR ALL
USING (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND EXISTS (
    SELECT 1 FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
)
WITH CHECK (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND EXISTS (
    SELECT 1 FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
);

-- Create indexes for candidates
CREATE INDEX idx_candidates_vacancy ON public.candidates(vacancy_id);
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_document ON public.candidates(document_number);

-- Trigger for updated_at
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- SELECTION STEPS TABLE
-- =====================
CREATE TABLE public.selection_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  
  -- Step details
  step_type public.selection_step_type NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 1,
  
  -- Scheduling
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  -- Assignment
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluator_name TEXT,
  
  -- Status and result
  status public.selection_step_status NOT NULL DEFAULT 'pending',
  score NUMERIC,
  result TEXT, -- detailed result description
  
  -- Documentation
  notes TEXT,
  document_url TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on selection_steps
ALTER TABLE public.selection_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for selection_steps
CREATE POLICY "Users can view selection steps from their company"
ON public.selection_steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
  OR public.is_admin()
);

CREATE POLICY "Admin RRHH and Psicologo can manage selection steps"
ON public.selection_steps FOR ALL
USING (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
)
WITH CHECK (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
);

-- Create indexes for selection_steps
CREATE INDEX idx_selection_steps_candidate ON public.selection_steps(candidate_id);
CREATE INDEX idx_selection_steps_type ON public.selection_steps(step_type);

-- Trigger for updated_at
CREATE TRIGGER update_selection_steps_updated_at
  BEFORE UPDATE ON public.selection_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();