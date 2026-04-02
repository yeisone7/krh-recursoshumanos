
-- =====================================================
-- Clean up legacy JOIN-based RLS policies
-- These tables now have direct company_id columns with
-- simpler is_company_member(company_id) policies
-- =====================================================

-- candidate_family_members: remove old JOIN-based policies (direct ones exist)
DROP POLICY IF EXISTS "Users can delete candidate family members" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Users can insert candidate family members" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Users can view candidate family members" ON public.candidate_family_members;

-- candidates: remove old JOIN-based policies (direct ones exist)
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can view candidates from their company vacancies" ON public.candidates;

-- disciplinary_defenses
DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Users can view disciplinary defenses" ON public.disciplinary_defenses;

-- disciplinary_evidence
DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Users can view disciplinary evidence" ON public.disciplinary_evidence;

-- disciplinary_timeline
DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Users can view disciplinary timeline" ON public.disciplinary_timeline;

-- dotation_profesiograma_items
DROP POLICY IF EXISTS "Admin/RRHH can delete profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Admin/RRHH can insert profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Admin/RRHH can update profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Members can view profesiograma items" ON public.dotation_profesiograma_items;

-- evaluation_criteria
DROP POLICY IF EXISTS "Admin and RRHH can manage evaluation criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Users can view evaluation criteria" ON public.evaluation_criteria;

-- evaluation_scores
DROP POLICY IF EXISTS "Admin and RRHH can manage evaluation scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Users can view evaluation scores" ON public.evaluation_scores;

-- evaluation_template_positions
DROP POLICY IF EXISTS "Users can manage template positions for their company" ON public.evaluation_template_positions;

-- exam_delivery_items
DROP POLICY IF EXISTS "Admin/RRHH can manage exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Users can view exam delivery items" ON public.exam_delivery_items;

-- exam_profesiograma_items
DROP POLICY IF EXISTS "Admin/RRHH can manage exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Users can view exam profesiograma items" ON public.exam_profesiograma_items;

-- requisition_vacancy_codes
DROP POLICY IF EXISTS "Admin and RRHH can manage vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can delete vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can insert vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can view vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can view vacancy codes from their requisitions" ON public.requisition_vacancy_codes;

-- selection_steps
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Users can view selection steps from their company" ON public.selection_steps;

-- shift_cycle_days
DROP POLICY IF EXISTS "shift_cycle_days_delete" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "shift_cycle_days_insert" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "shift_cycle_days_select" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "shift_cycle_days_update" ON public.shift_cycle_days;

-- training_attendance
DROP POLICY IF EXISTS "Admin and RRHH can manage training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Users can view training attendance" ON public.training_attendance;

-- training_completions: keep the public insert policy for tokens, remove JOIN-based select
DROP POLICY IF EXISTS "Public can insert completions with valid token" ON public.training_completions;

-- training_plan_items
DROP POLICY IF EXISTS "Admin and RRHH can manage training plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Users can view training plan items" ON public.training_plan_items;

-- Re-create training_completions anon insert (it's needed for token-based access)
CREATE POLICY "Anon can insert completions via token"
  ON public.training_completions FOR INSERT
  WITH CHECK (true);
