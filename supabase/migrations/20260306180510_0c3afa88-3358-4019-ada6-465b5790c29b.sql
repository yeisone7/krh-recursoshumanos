-- Onboarding checklist table for new employees
CREATE TABLE public.employee_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  task_label TEXT NOT NULL,
  task_description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, task_key)
);

ALTER TABLE public.employee_onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view onboarding tasks for their company"
  ON public.employee_onboarding_tasks FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert onboarding tasks for their company"
  ON public.employee_onboarding_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update onboarding tasks for their company"
  ON public.employee_onboarding_tasks FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id));