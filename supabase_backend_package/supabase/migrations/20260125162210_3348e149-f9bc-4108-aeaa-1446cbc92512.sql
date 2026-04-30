-- Create table to link employees with auth users
CREATE TABLE IF NOT EXISTS public.employee_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(employee_id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.employee_user_links ENABLE ROW LEVEL SECURITY;

-- Policies for employee_user_links
CREATE POLICY "Admin and RRHH can manage employee links"
  ON public.employee_user_links FOR ALL
  USING (is_admin_or_rrhh())
  WITH CHECK (is_admin_or_rrhh());

CREATE POLICY "Employees can view their own link"
  ON public.employee_user_links FOR SELECT
  USING (user_id = auth.uid());

-- Create table for change requests
CREATE TABLE IF NOT EXISTS public.employee_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  request_type text NOT NULL,
  field_name text NOT NULL,
  current_value text,
  requested_value text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_change_requests ENABLE ROW LEVEL SECURITY;

-- Policies for change requests
CREATE POLICY "Admin and RRHH can manage change requests"
  ON public.employee_change_requests FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Employees can view their own requests"
  ON public.employee_change_requests FOR SELECT
  USING (requested_by = auth.uid());

CREATE POLICY "Employees can insert their own requests"
  ON public.employee_change_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());

-- Function to get current user's employee_id
CREATE OR REPLACE FUNCTION public.get_my_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id
  FROM public.employee_user_links
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$;

-- Trigger for updated_at
CREATE TRIGGER update_employee_change_requests_updated_at
  BEFORE UPDATE ON public.employee_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();