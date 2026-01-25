
-- Enum para tipos de evaluación
CREATE TYPE public.evaluation_type AS ENUM ('self', 'manager', 'peer', '360');

-- Enum para estados del ciclo
CREATE TYPE public.evaluation_cycle_status AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- Enum para estados de evaluación individual
CREATE TYPE public.evaluation_status AS ENUM ('pending', 'in_progress', 'submitted', 'reviewed', 'approved');

-- Tabla de plantillas de evaluación
CREATE TABLE public.evaluation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de competencias/criterios de evaluación
CREATE TABLE public.evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  weight NUMERIC DEFAULT 1,
  max_score INTEGER DEFAULT 5,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de ciclos de evaluación
CREATE TABLE public.evaluation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.evaluation_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  self_evaluation_deadline DATE,
  manager_evaluation_deadline DATE,
  status evaluation_cycle_status NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de evaluaciones individuales
CREATE TABLE public.performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  evaluator_id UUID,
  evaluation_type evaluation_type NOT NULL DEFAULT 'manager',
  status evaluation_status NOT NULL DEFAULT 'pending',
  overall_score NUMERIC,
  overall_rating TEXT,
  strengths TEXT,
  areas_to_improve TEXT,
  general_comments TEXT,
  employee_comments TEXT,
  development_plan TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de calificaciones por criterio
CREATE TABLE public.evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.performance_evaluations(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, criteria_id)
);

-- Tabla de objetivos/metas
CREATE TABLE public.performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value TEXT,
  achieved_value TEXT,
  weight NUMERIC DEFAULT 1,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  progress_percentage INTEGER DEFAULT 0,
  manager_feedback TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evaluation_templates
CREATE POLICY "Admin and RRHH can manage evaluation templates"
ON public.evaluation_templates FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company evaluation templates"
ON public.evaluation_templates FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for evaluation_criteria
CREATE POLICY "Admin and RRHH can manage evaluation criteria"
ON public.evaluation_criteria FOR ALL
USING (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM evaluation_templates t WHERE t.id = evaluation_criteria.template_id AND is_company_member(t.company_id)
))
WITH CHECK (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM evaluation_templates t WHERE t.id = evaluation_criteria.template_id AND is_company_member(t.company_id)
));

CREATE POLICY "Users can view evaluation criteria"
ON public.evaluation_criteria FOR SELECT
USING (EXISTS (
  SELECT 1 FROM evaluation_templates t WHERE t.id = evaluation_criteria.template_id AND (is_company_member(t.company_id) OR is_admin())
));

-- RLS Policies for evaluation_cycles
CREATE POLICY "Admin and RRHH can manage evaluation cycles"
ON public.evaluation_cycles FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company evaluation cycles"
ON public.evaluation_cycles FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for performance_evaluations
CREATE POLICY "Admin and RRHH can manage performance evaluations"
ON public.performance_evaluations FOR ALL
USING (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM evaluation_cycles c WHERE c.id = performance_evaluations.cycle_id AND is_company_member(c.company_id)
))
WITH CHECK (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM evaluation_cycles c WHERE c.id = performance_evaluations.cycle_id AND is_company_member(c.company_id)
));

CREATE POLICY "Users can view evaluations from their company cycles"
ON public.performance_evaluations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM evaluation_cycles c WHERE c.id = performance_evaluations.cycle_id AND (is_company_member(c.company_id) OR is_admin())
));

-- RLS Policies for evaluation_scores
CREATE POLICY "Admin and RRHH can manage evaluation scores"
ON public.evaluation_scores FOR ALL
USING (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM performance_evaluations pe 
  JOIN evaluation_cycles c ON c.id = pe.cycle_id 
  WHERE pe.id = evaluation_scores.evaluation_id AND is_company_member(c.company_id)
))
WITH CHECK (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM performance_evaluations pe 
  JOIN evaluation_cycles c ON c.id = pe.cycle_id 
  WHERE pe.id = evaluation_scores.evaluation_id AND is_company_member(c.company_id)
));

CREATE POLICY "Users can view evaluation scores"
ON public.evaluation_scores FOR SELECT
USING (EXISTS (
  SELECT 1 FROM performance_evaluations pe 
  JOIN evaluation_cycles c ON c.id = pe.cycle_id 
  WHERE pe.id = evaluation_scores.evaluation_id AND (is_company_member(c.company_id) OR is_admin())
));

-- RLS Policies for performance_goals
CREATE POLICY "Admin and RRHH can manage performance goals"
ON public.performance_goals FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible performance goals"
ON public.performance_goals FOR SELECT
USING (has_employee_v2_access(employee_id) OR is_admin());

-- Triggers for updated_at
CREATE TRIGGER update_evaluation_templates_updated_at
  BEFORE UPDATE ON public.evaluation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_cycles_updated_at
  BEFORE UPDATE ON public.evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_evaluations_updated_at
  BEFORE UPDATE ON public.performance_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_goals_updated_at
  BEFORE UPDATE ON public.performance_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
