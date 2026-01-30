-- Add work_labor_description field for "Obra o Labor" contracts
-- This field describes the specific work or task to be performed

ALTER TABLE public.contracts
ADD COLUMN work_labor_description TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.contracts.work_labor_description IS 'Descripción del objeto o labor a realizar, requerido para contratos de tipo Obra o Labor';