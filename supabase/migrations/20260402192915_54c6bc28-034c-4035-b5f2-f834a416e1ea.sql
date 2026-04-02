
-- 1. selection_steps (parent: candidates → now has company_id)
ALTER TABLE public.selection_steps ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.selection_steps ss SET company_id = c.company_id FROM public.candidates c WHERE ss.candidate_id = c.id AND ss.company_id IS NULL;
DELETE FROM public.selection_steps WHERE company_id IS NULL;
ALTER TABLE public.selection_steps ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_selection_steps_company ON public.selection_steps(company_id);
DROP POLICY IF EXISTS "Users can manage selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Company members can view selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Company members can insert selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Company members can update selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Company members can delete selection steps" ON public.selection_steps;
CREATE POLICY "Company members can view selection steps" ON public.selection_steps FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert selection steps" ON public.selection_steps FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update selection steps" ON public.selection_steps FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete selection steps" ON public.selection_steps FOR DELETE USING (public.is_company_member(company_id));

-- 2. evaluation_criteria (parent: evaluation_templates)
ALTER TABLE public.evaluation_criteria ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.evaluation_criteria ec SET company_id = et.company_id FROM public.evaluation_templates et WHERE ec.template_id = et.id AND ec.company_id IS NULL;
DELETE FROM public.evaluation_criteria WHERE company_id IS NULL;
ALTER TABLE public.evaluation_criteria ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_company ON public.evaluation_criteria(company_id);
DROP POLICY IF EXISTS "Users can manage evaluation criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Company members can view eval criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Company members can insert eval criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Company members can update eval criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Company members can delete eval criteria" ON public.evaluation_criteria;
CREATE POLICY "Company members can view eval criteria" ON public.evaluation_criteria FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert eval criteria" ON public.evaluation_criteria FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update eval criteria" ON public.evaluation_criteria FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete eval criteria" ON public.evaluation_criteria FOR DELETE USING (public.is_company_member(company_id));

-- 3. evaluation_scores (parent: performance_evaluations)
ALTER TABLE public.evaluation_scores ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.evaluation_scores es SET company_id = pe.company_id FROM public.performance_evaluations pe WHERE es.evaluation_id = pe.id AND es.company_id IS NULL;
DELETE FROM public.evaluation_scores WHERE company_id IS NULL;
ALTER TABLE public.evaluation_scores ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_company ON public.evaluation_scores(company_id);
DROP POLICY IF EXISTS "Users can manage evaluation scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Company members can view eval scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Company members can insert eval scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Company members can update eval scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Company members can delete eval scores" ON public.evaluation_scores;
CREATE POLICY "Company members can view eval scores" ON public.evaluation_scores FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert eval scores" ON public.evaluation_scores FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update eval scores" ON public.evaluation_scores FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete eval scores" ON public.evaluation_scores FOR DELETE USING (public.is_company_member(company_id));

-- 4. evaluation_template_positions (parent: evaluation_templates)
ALTER TABLE public.evaluation_template_positions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.evaluation_template_positions etp SET company_id = et.company_id FROM public.evaluation_templates et WHERE etp.template_id = et.id AND etp.company_id IS NULL;
DELETE FROM public.evaluation_template_positions WHERE company_id IS NULL;
ALTER TABLE public.evaluation_template_positions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_template_positions_company ON public.evaluation_template_positions(company_id);
DROP POLICY IF EXISTS "Users can manage template positions" ON public.evaluation_template_positions;
DROP POLICY IF EXISTS "Company members can view template positions" ON public.evaluation_template_positions;
DROP POLICY IF EXISTS "Company members can insert template positions" ON public.evaluation_template_positions;
DROP POLICY IF EXISTS "Company members can update template positions" ON public.evaluation_template_positions;
DROP POLICY IF EXISTS "Company members can delete template positions" ON public.evaluation_template_positions;
CREATE POLICY "Company members can view template positions" ON public.evaluation_template_positions FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert template positions" ON public.evaluation_template_positions FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update template positions" ON public.evaluation_template_positions FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete template positions" ON public.evaluation_template_positions FOR DELETE USING (public.is_company_member(company_id));

-- 5. dotation_profesiograma_items (parent: dotation_profesiograma)
ALTER TABLE public.dotation_profesiograma_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.dotation_profesiograma_items dpi SET company_id = dp.company_id FROM public.dotation_profesiograma dp WHERE dpi.profesiograma_id = dp.id AND dpi.company_id IS NULL;
DELETE FROM public.dotation_profesiograma_items WHERE company_id IS NULL;
ALTER TABLE public.dotation_profesiograma_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dotation_profesiograma_items_company ON public.dotation_profesiograma_items(company_id);
DROP POLICY IF EXISTS "Users can manage profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can view profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can insert profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can update profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can delete profesiograma items" ON public.dotation_profesiograma_items;
CREATE POLICY "Company members can view profesiograma items" ON public.dotation_profesiograma_items FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert profesiograma items" ON public.dotation_profesiograma_items FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update profesiograma items" ON public.dotation_profesiograma_items FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete profesiograma items" ON public.dotation_profesiograma_items FOR DELETE USING (public.is_company_member(company_id));

-- 6. exam_profesiograma_items (parent: exam_profesiograma)
ALTER TABLE public.exam_profesiograma_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.exam_profesiograma_items epi SET company_id = ep.company_id FROM public.exam_profesiograma ep WHERE epi.profesiograma_id = ep.id AND epi.company_id IS NULL;
DELETE FROM public.exam_profesiograma_items WHERE company_id IS NULL;
ALTER TABLE public.exam_profesiograma_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_profesiograma_items_company ON public.exam_profesiograma_items(company_id);
DROP POLICY IF EXISTS "Users can manage exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can view exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can insert exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can update exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can delete exam prof items" ON public.exam_profesiograma_items;
CREATE POLICY "Company members can view exam prof items" ON public.exam_profesiograma_items FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert exam prof items" ON public.exam_profesiograma_items FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update exam prof items" ON public.exam_profesiograma_items FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete exam prof items" ON public.exam_profesiograma_items FOR DELETE USING (public.is_company_member(company_id));

-- 7. exam_delivery_transactions (parent: employees_v2)
ALTER TABLE public.exam_delivery_transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.exam_delivery_transactions edt SET company_id = e.company_id FROM public.employees_v2 e WHERE edt.employee_id = e.id AND edt.company_id IS NULL;
DELETE FROM public.exam_delivery_transactions WHERE company_id IS NULL;
ALTER TABLE public.exam_delivery_transactions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_delivery_transactions_company ON public.exam_delivery_transactions(company_id);
DROP POLICY IF EXISTS "Users can manage exam delivery transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can view exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can insert exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can update exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can delete exam transactions" ON public.exam_delivery_transactions;
CREATE POLICY "Company members can view exam transactions" ON public.exam_delivery_transactions FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert exam transactions" ON public.exam_delivery_transactions FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update exam transactions" ON public.exam_delivery_transactions FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete exam transactions" ON public.exam_delivery_transactions FOR DELETE USING (public.is_company_member(company_id));

-- 8. exam_delivery_items (parent: exam_delivery_transactions → now has company_id)
ALTER TABLE public.exam_delivery_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.exam_delivery_items edi SET company_id = edt.company_id FROM public.exam_delivery_transactions edt WHERE edi.transaction_id = edt.id AND edi.company_id IS NULL;
DELETE FROM public.exam_delivery_items WHERE company_id IS NULL;
ALTER TABLE public.exam_delivery_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_delivery_items_company ON public.exam_delivery_items(company_id);
DROP POLICY IF EXISTS "Users can manage exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can view exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can insert exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can update exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can delete exam items" ON public.exam_delivery_items;
CREATE POLICY "Company members can view exam items" ON public.exam_delivery_items FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert exam items" ON public.exam_delivery_items FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update exam items" ON public.exam_delivery_items FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete exam items" ON public.exam_delivery_items FOR DELETE USING (public.is_company_member(company_id));

-- 9. shift_cycle_days (parent: shift_cycles)
ALTER TABLE public.shift_cycle_days ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.shift_cycle_days scd SET company_id = sc.company_id FROM public.shift_cycles sc WHERE scd.shift_cycle_id = sc.id AND scd.company_id IS NULL;
DELETE FROM public.shift_cycle_days WHERE company_id IS NULL;
ALTER TABLE public.shift_cycle_days ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_cycle_days_company ON public.shift_cycle_days(company_id);
DROP POLICY IF EXISTS "Users can manage shift cycle days" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "Company members can view shift cycle days" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "Company members can insert shift cycle days" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "Company members can update shift cycle days" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "Company members can delete shift cycle days" ON public.shift_cycle_days;
CREATE POLICY "Company members can view shift cycle days" ON public.shift_cycle_days FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert shift cycle days" ON public.shift_cycle_days FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update shift cycle days" ON public.shift_cycle_days FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete shift cycle days" ON public.shift_cycle_days FOR DELETE USING (public.is_company_member(company_id));

-- 10. employee_shifts (parent: employees - legacy table)
ALTER TABLE public.employee_shifts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_shifts es SET company_id = e.company_id FROM public.employees e WHERE es.employee_id = e.id AND es.company_id IS NULL;
DELETE FROM public.employee_shifts WHERE company_id IS NULL;
ALTER TABLE public.employee_shifts ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_shifts_company ON public.employee_shifts(company_id);
DROP POLICY IF EXISTS "Users can manage employee shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Company members can view employee shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Company members can insert employee shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Company members can update employee shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Company members can delete employee shifts" ON public.employee_shifts;
CREATE POLICY "Company members can view employee shifts" ON public.employee_shifts FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert employee shifts" ON public.employee_shifts FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update employee shifts" ON public.employee_shifts FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete employee shifts" ON public.employee_shifts FOR DELETE USING (public.is_company_member(company_id));

-- 11. training_attendance (parent: training_sessions)
ALTER TABLE public.training_attendance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.training_attendance ta SET company_id = ts.company_id FROM public.training_sessions ts WHERE ta.session_id = ts.id AND ta.company_id IS NULL;
DELETE FROM public.training_attendance WHERE company_id IS NULL;
ALTER TABLE public.training_attendance ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_attendance_company ON public.training_attendance(company_id);
DROP POLICY IF EXISTS "Users can manage training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can view training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can insert training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can update training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can delete training attendance" ON public.training_attendance;
CREATE POLICY "Company members can view training attendance" ON public.training_attendance FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert training attendance" ON public.training_attendance FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update training attendance" ON public.training_attendance FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete training attendance" ON public.training_attendance FOR DELETE USING (public.is_company_member(company_id));

-- 12. training_media (parent: training_courses)
ALTER TABLE public.training_media ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.training_media tm SET company_id = tc.company_id FROM public.training_courses tc WHERE tm.course_id = tc.id AND tm.company_id IS NULL;
DELETE FROM public.training_media WHERE company_id IS NULL;
ALTER TABLE public.training_media ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_media_company ON public.training_media(company_id);
DROP POLICY IF EXISTS "Users can manage training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can view training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can insert training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can update training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can delete training media" ON public.training_media;
CREATE POLICY "Company members can view training media" ON public.training_media FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert training media" ON public.training_media FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update training media" ON public.training_media FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete training media" ON public.training_media FOR DELETE USING (public.is_company_member(company_id));

-- 13. training_plan_items (parent: training_plans)
ALTER TABLE public.training_plan_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.training_plan_items tpi SET company_id = tp.company_id FROM public.training_plans tp WHERE tpi.plan_id = tp.id AND tpi.company_id IS NULL;
DELETE FROM public.training_plan_items WHERE company_id IS NULL;
ALTER TABLE public.training_plan_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_plan_items_company ON public.training_plan_items(company_id);
DROP POLICY IF EXISTS "Users can manage training plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can view plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can insert plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can update plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can delete plan items" ON public.training_plan_items;
CREATE POLICY "Company members can view plan items" ON public.training_plan_items FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert plan items" ON public.training_plan_items FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update plan items" ON public.training_plan_items FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete plan items" ON public.training_plan_items FOR DELETE USING (public.is_company_member(company_id));

-- 14. requisition_vacancy_codes (parent: personnel_requisitions)
ALTER TABLE public.requisition_vacancy_codes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.requisition_vacancy_codes rvc SET company_id = pr.company_id FROM public.personnel_requisitions pr WHERE rvc.requisition_id = pr.id AND rvc.company_id IS NULL;
DELETE FROM public.requisition_vacancy_codes WHERE company_id IS NULL;
ALTER TABLE public.requisition_vacancy_codes ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requisition_vacancy_codes_company ON public.requisition_vacancy_codes(company_id);
DROP POLICY IF EXISTS "Users can manage vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can view vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can insert vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can update vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can delete vacancy codes" ON public.requisition_vacancy_codes;
CREATE POLICY "Company members can view vacancy codes" ON public.requisition_vacancy_codes FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert vacancy codes" ON public.requisition_vacancy_codes FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update vacancy codes" ON public.requisition_vacancy_codes FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete vacancy codes" ON public.requisition_vacancy_codes FOR DELETE USING (public.is_company_member(company_id));
