-- Support the company-scoped filters and ordering used by the General Employee Report.
-- Partial indexes keep the frequently queried "current" datasets small.
CREATE INDEX IF NOT EXISTS employees_v2_company_id_id_idx
  ON public.employees_v2 (company_id, id);

CREATE INDEX IF NOT EXISTS employee_employment_cycles_company_employee_start_idx
  ON public.employee_employment_cycles (company_id, employee_id, start_date DESC);

CREATE INDEX IF NOT EXISTS employee_contact_company_current_employee_idx
  ON public.employee_contact (company_id, employee_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS employee_family_company_current_employee_idx
  ON public.employee_family (company_id, employee_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS employee_family_members_company_employee_idx
  ON public.employee_family_members (company_id, employee_id);

CREATE INDEX IF NOT EXISTS employee_work_info_company_current_employee_idx
  ON public.employee_work_info (company_id, employee_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS employee_social_security_company_current_employee_idx
  ON public.employee_social_security (company_id, employee_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS employee_bank_info_company_current_employee_idx
  ON public.employee_bank_info (company_id, employee_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS employee_schedule_company_current_employee_idx
  ON public.employee_schedule (company_id, employee_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS employee_time_config_company_active_employee_idx
  ON public.employee_time_config (company_id, employee_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS employee_center_assignments_company_employee_idx
  ON public.employee_operation_center_assignments (company_id, employee_id);

CREATE INDEX IF NOT EXISTS contracts_company_employee_start_idx
  ON public.contracts (company_id, employee_id, start_date DESC);

CREATE INDEX IF NOT EXISTS employee_documents_company_valid_employee_idx
  ON public.employee_documents (company_id, employee_id)
  WHERE is_valid = true;

CREATE INDEX IF NOT EXISTS employee_certifications_company_valid_employee_idx
  ON public.employee_certifications (company_id, employee_id)
  WHERE is_valid = true;

CREATE INDEX IF NOT EXISTS employee_vaccinations_company_employee_idx
  ON public.employee_vaccinations (company_id, employee_id);
