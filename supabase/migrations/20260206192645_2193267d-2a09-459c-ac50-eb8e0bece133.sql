-- Add proposed salary and contract type to personnel requisitions form
ALTER TABLE public.personnel_requisitions 
ADD COLUMN IF NOT EXISTS salario_propuesto numeric(12,2),
ADD COLUMN IF NOT EXISTS tipo_contrato_solicitado text;

-- Add comment for documentation
COMMENT ON COLUMN public.personnel_requisitions.salario_propuesto IS 'Salario propuesto por el solicitante para la posición';
COMMENT ON COLUMN public.personnel_requisitions.tipo_contrato_solicitado IS 'Tipo de contrato sugerido por el solicitante';