-- Agregar columna para la plantilla de contrato en contract_type_config
ALTER TABLE public.contract_type_config 
ADD COLUMN IF NOT EXISTS template_url TEXT,
ADD COLUMN IF NOT EXISTS template_file_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Comentario explicativo
COMMENT ON COLUMN public.contract_type_config.template_url IS 'URL del archivo de plantilla de contrato (DOCX/PDF)';
COMMENT ON COLUMN public.contract_type_config.template_file_name IS 'Nombre original del archivo de plantilla';
COMMENT ON COLUMN public.contract_type_config.description IS 'Descripción del tipo de contrato';