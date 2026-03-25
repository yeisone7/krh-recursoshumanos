
ALTER TABLE public.selection_steps 
ADD COLUMN IF NOT EXISTS provider text,
ADD COLUMN IF NOT EXISTS doctor_name text,
ADD COLUMN IF NOT EXISTS medical_concept text,
ADD COLUMN IF NOT EXISTS exam_profesiograma_items jsonb;
