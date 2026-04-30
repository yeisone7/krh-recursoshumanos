
CREATE TABLE public.employee_family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible employee family members"
ON public.employee_family_members FOR SELECT TO authenticated
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee family members"
ON public.employee_family_members FOR ALL TO authenticated
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));
