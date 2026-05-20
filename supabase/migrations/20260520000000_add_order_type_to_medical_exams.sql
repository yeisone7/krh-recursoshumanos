ALTER TABLE public.selection_steps ADD COLUMN IF NOT EXISTS order_type TEXT;
ALTER TABLE public.medical_exams ADD COLUMN IF NOT EXISTS order_type TEXT;
