
CREATE TABLE public.onboarding_task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  task_label TEXT NOT NULL,
  task_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, position_id, task_key)
);

ALTER TABLE public.onboarding_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view templates"
  ON public.onboarding_task_templates
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can manage templates"
  ON public.onboarding_task_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_rrhh())
  WITH CHECK (public.is_admin_or_rrhh());

CREATE TRIGGER update_onboarding_task_templates_updated_at
  BEFORE UPDATE ON public.onboarding_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
