ALTER TABLE public.personnel_requisitions
ADD COLUMN IF NOT EXISTS proceso_exclusivo_pcd boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.personnel_requisitions.proceso_exclusivo_pcd IS
'Indica si la requisicion corresponde a un proceso de seleccion exclusivo para personas en situacion de discapacidad (PcD).';
