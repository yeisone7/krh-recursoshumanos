
-- =============================================
-- BATCH 1: Employee sub-tables
-- =============================================

-- 1. employee_bank_info
ALTER TABLE public.employee_bank_info ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_bank_info ebi SET company_id = e.company_id FROM public.employees_v2 e WHERE ebi.employee_id = e.id AND ebi.company_id IS NULL;
ALTER TABLE public.employee_bank_info ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_bank_info_company ON public.employee_bank_info(company_id);
DROP POLICY IF EXISTS "Users can view employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Users can insert employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Users can update employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Users can delete employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Company members can view bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Company members can insert bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Company members can update bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Company members can delete bank info" ON public.employee_bank_info;
CREATE POLICY "Company members can view bank info" ON public.employee_bank_info FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert bank info" ON public.employee_bank_info FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update bank info" ON public.employee_bank_info FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete bank info" ON public.employee_bank_info FOR DELETE USING (public.is_company_member(company_id));

-- 2. employee_contact
ALTER TABLE public.employee_contact ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_contact ec SET company_id = e.company_id FROM public.employees_v2 e WHERE ec.employee_id = e.id AND ec.company_id IS NULL;
ALTER TABLE public.employee_contact ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_contact_company ON public.employee_contact(company_id);
DROP POLICY IF EXISTS "Users can view employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Users can insert employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Users can update employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Users can delete employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Company members can view contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Company members can insert contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Company members can update contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Company members can delete contact" ON public.employee_contact;
CREATE POLICY "Company members can view contact" ON public.employee_contact FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert contact" ON public.employee_contact FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update contact" ON public.employee_contact FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete contact" ON public.employee_contact FOR DELETE USING (public.is_company_member(company_id));

-- 3. employee_family
ALTER TABLE public.employee_family ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_family ef SET company_id = e.company_id FROM public.employees_v2 e WHERE ef.employee_id = e.id AND ef.company_id IS NULL;
ALTER TABLE public.employee_family ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_family_company ON public.employee_family(company_id);
DROP POLICY IF EXISTS "Users can view employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Users can insert employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Users can update employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Users can delete employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Company members can view family" ON public.employee_family;
DROP POLICY IF EXISTS "Company members can insert family" ON public.employee_family;
DROP POLICY IF EXISTS "Company members can update family" ON public.employee_family;
DROP POLICY IF EXISTS "Company members can delete family" ON public.employee_family;
CREATE POLICY "Company members can view family" ON public.employee_family FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert family" ON public.employee_family FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update family" ON public.employee_family FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete family" ON public.employee_family FOR DELETE USING (public.is_company_member(company_id));

-- 4. employee_social_security
ALTER TABLE public.employee_social_security ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_social_security ess SET company_id = e.company_id FROM public.employees_v2 e WHERE ess.employee_id = e.id AND ess.company_id IS NULL;
ALTER TABLE public.employee_social_security ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_social_security_company ON public.employee_social_security(company_id);
DROP POLICY IF EXISTS "Users can view employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Users can insert employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Users can update employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Users can delete employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Company members can view social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Company members can insert social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Company members can update social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Company members can delete social security" ON public.employee_social_security;
CREATE POLICY "Company members can view social security" ON public.employee_social_security FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert social security" ON public.employee_social_security FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update social security" ON public.employee_social_security FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete social security" ON public.employee_social_security FOR DELETE USING (public.is_company_member(company_id));

-- 5. employee_certifications
ALTER TABLE public.employee_certifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_certifications ec SET company_id = e.company_id FROM public.employees_v2 e WHERE ec.employee_id = e.id AND ec.company_id IS NULL;
ALTER TABLE public.employee_certifications ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_certifications_company ON public.employee_certifications(company_id);
DROP POLICY IF EXISTS "Users can view certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Users can insert certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Users can update certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Users can delete certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Company members can view certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Company members can insert certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Company members can update certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Company members can delete certifications" ON public.employee_certifications;
CREATE POLICY "Company members can view certifications" ON public.employee_certifications FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert certifications" ON public.employee_certifications FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update certifications" ON public.employee_certifications FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete certifications" ON public.employee_certifications FOR DELETE USING (public.is_company_member(company_id));

-- 6. employee_vaccinations
ALTER TABLE public.employee_vaccinations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_vaccinations ev SET company_id = e.company_id FROM public.employees_v2 e WHERE ev.employee_id = e.id AND ev.company_id IS NULL;
ALTER TABLE public.employee_vaccinations ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_vaccinations_company ON public.employee_vaccinations(company_id);
DROP POLICY IF EXISTS "Users can view vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Users can insert vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Users can update vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Users can delete vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Company members can view vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Company members can insert vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Company members can update vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Company members can delete vaccinations" ON public.employee_vaccinations;
CREATE POLICY "Company members can view vaccinations" ON public.employee_vaccinations FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert vaccinations" ON public.employee_vaccinations FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update vaccinations" ON public.employee_vaccinations FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete vaccinations" ON public.employee_vaccinations FOR DELETE USING (public.is_company_member(company_id));

-- 7. employee_schedule
ALTER TABLE public.employee_schedule ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_schedule es SET company_id = e.company_id FROM public.employees_v2 e WHERE es.employee_id = e.id AND es.company_id IS NULL;
ALTER TABLE public.employee_schedule ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_schedule_company ON public.employee_schedule(company_id);
DROP POLICY IF EXISTS "Users can manage employee schedules" ON public.employee_schedule;
DROP POLICY IF EXISTS "Company members can view schedules" ON public.employee_schedule;
DROP POLICY IF EXISTS "Company members can insert schedules" ON public.employee_schedule;
DROP POLICY IF EXISTS "Company members can update schedules" ON public.employee_schedule;
DROP POLICY IF EXISTS "Company members can delete schedules" ON public.employee_schedule;
CREATE POLICY "Company members can view schedules" ON public.employee_schedule FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert schedules" ON public.employee_schedule FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update schedules" ON public.employee_schedule FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete schedules" ON public.employee_schedule FOR DELETE USING (public.is_company_member(company_id));

-- 8. employee_shift_assignments
ALTER TABLE public.employee_shift_assignments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_shift_assignments esa SET company_id = e.company_id FROM public.employees_v2 e WHERE esa.employee_id = e.id AND esa.company_id IS NULL;
ALTER TABLE public.employee_shift_assignments ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_shift_assignments_company ON public.employee_shift_assignments(company_id);
DROP POLICY IF EXISTS "Users can manage shift assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Company members can view shift assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Company members can insert shift assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Company members can update shift assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Company members can delete shift assignments" ON public.employee_shift_assignments;
CREATE POLICY "Company members can view shift assignments" ON public.employee_shift_assignments FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert shift assignments" ON public.employee_shift_assignments FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update shift assignments" ON public.employee_shift_assignments FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete shift assignments" ON public.employee_shift_assignments FOR DELETE USING (public.is_company_member(company_id));

-- 9. employee_time_config
ALTER TABLE public.employee_time_config ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_time_config etc SET company_id = e.company_id FROM public.employees_v2 e WHERE etc.employee_id = e.id AND etc.company_id IS NULL;
ALTER TABLE public.employee_time_config ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_time_config_company ON public.employee_time_config(company_id);
DROP POLICY IF EXISTS "Users can manage time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can view time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can insert time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can update time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can delete time config" ON public.employee_time_config;
CREATE POLICY "Company members can view time config" ON public.employee_time_config FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert time config" ON public.employee_time_config FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update time config" ON public.employee_time_config FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete time config" ON public.employee_time_config FOR DELETE USING (public.is_company_member(company_id));

-- 10. employee_loan_payments
ALTER TABLE public.employee_loan_payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_loan_payments elp SET company_id = el.company_id FROM public.employee_loans el WHERE elp.loan_id = el.id AND elp.company_id IS NULL;
ALTER TABLE public.employee_loan_payments ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_loan_payments_company ON public.employee_loan_payments(company_id);
DROP POLICY IF EXISTS "Users can view loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Users can insert loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Users can update loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Users can delete loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Company members can view loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Company members can insert loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Company members can update loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Company members can delete loan payments" ON public.employee_loan_payments;
CREATE POLICY "Company members can view loan payments" ON public.employee_loan_payments FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert loan payments" ON public.employee_loan_payments FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update loan payments" ON public.employee_loan_payments FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete loan payments" ON public.employee_loan_payments FOR DELETE USING (public.is_company_member(company_id));

-- =============================================
-- BATCH 2: Disciplinary sub-tables
-- =============================================

-- 11. disciplinary_defenses
ALTER TABLE public.disciplinary_defenses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.disciplinary_defenses dd SET company_id = dp.company_id FROM public.disciplinary_processes dp WHERE dd.process_id = dp.id AND dd.company_id IS NULL;
ALTER TABLE public.disciplinary_defenses ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disciplinary_defenses_company ON public.disciplinary_defenses(company_id);
DROP POLICY IF EXISTS "Users can manage defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can view defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can insert defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can update defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can delete defenses" ON public.disciplinary_defenses;
CREATE POLICY "Company members can view defenses" ON public.disciplinary_defenses FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert defenses" ON public.disciplinary_defenses FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update defenses" ON public.disciplinary_defenses FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete defenses" ON public.disciplinary_defenses FOR DELETE USING (public.is_company_member(company_id));

-- 12. disciplinary_evidence
ALTER TABLE public.disciplinary_evidence ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.disciplinary_evidence de SET company_id = dp.company_id FROM public.disciplinary_processes dp WHERE de.process_id = dp.id AND de.company_id IS NULL;
ALTER TABLE public.disciplinary_evidence ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disciplinary_evidence_company ON public.disciplinary_evidence(company_id);
DROP POLICY IF EXISTS "Users can manage evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can view evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can insert evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can update evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can delete evidence" ON public.disciplinary_evidence;
CREATE POLICY "Company members can view evidence" ON public.disciplinary_evidence FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert evidence" ON public.disciplinary_evidence FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update evidence" ON public.disciplinary_evidence FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete evidence" ON public.disciplinary_evidence FOR DELETE USING (public.is_company_member(company_id));

-- 13. disciplinary_timeline
ALTER TABLE public.disciplinary_timeline ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.disciplinary_timeline dt SET company_id = dp.company_id FROM public.disciplinary_processes dp WHERE dt.process_id = dp.id AND dt.company_id IS NULL;
ALTER TABLE public.disciplinary_timeline ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disciplinary_timeline_company ON public.disciplinary_timeline(company_id);
DROP POLICY IF EXISTS "Users can manage timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can view timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can insert timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can update timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can delete timeline" ON public.disciplinary_timeline;
CREATE POLICY "Company members can view timeline" ON public.disciplinary_timeline FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert timeline" ON public.disciplinary_timeline FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update timeline" ON public.disciplinary_timeline FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete timeline" ON public.disciplinary_timeline FOR DELETE USING (public.is_company_member(company_id));

-- =============================================
-- BATCH 3: Candidates & Selection
-- =============================================

-- 14. candidates (FK to vacancies)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.candidates c SET company_id = v.company_id FROM public.vacancies v WHERE c.vacancy_id = v.id AND c.company_id IS NULL;
ALTER TABLE public.candidates ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_company ON public.candidates(company_id);
DROP POLICY IF EXISTS "Users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members can delete candidates" ON public.candidates;
CREATE POLICY "Company members can view candidates" ON public.candidates FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert candidates" ON public.candidates FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update candidates" ON public.candidates FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete candidates" ON public.candidates FOR DELETE USING (public.is_company_member(company_id));

-- 15. candidate_family_members (FK to candidates)
ALTER TABLE public.candidate_family_members ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.candidate_family_members cfm SET company_id = c.company_id FROM public.candidates c WHERE cfm.candidate_id = c.id AND cfm.company_id IS NULL;
-- Some orphan records may exist, allow NULL temporarily then delete orphans
DELETE FROM public.candidate_family_members WHERE company_id IS NULL;
ALTER TABLE public.candidate_family_members ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidate_family_members_company ON public.candidate_family_members(company_id);
DROP POLICY IF EXISTS "Users can manage candidate family" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Company members can view candidate family" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Company members can insert candidate family" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Company members can update candidate family" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Company members can delete candidate family" ON public.candidate_family_members;
CREATE POLICY "Company members can view candidate family" ON public.candidate_family_members FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert candidate family" ON public.candidate_family_members FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update candidate family" ON public.candidate_family_members FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete candidate family" ON public.candidate_family_members FOR DELETE USING (public.is_company_member(company_id));
