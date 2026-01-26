-- Add extension_type column to distinguish between 'pactada' (agreed) and 'automatica' (automatic) extensions
-- per Colombian labor law (Art. 46 CST)
ALTER TABLE public.contract_extensions 
ADD COLUMN IF NOT EXISTS extension_type TEXT NOT NULL DEFAULT 'pactada' 
CHECK (extension_type IN ('pactada', 'automatica'));

-- Add comment explaining the column
COMMENT ON COLUMN public.contract_extensions.extension_type IS 'Tipo de prórroga según ley colombiana: pactada (acordada por escrito) o automatica (por falta de preaviso de 30 días)';