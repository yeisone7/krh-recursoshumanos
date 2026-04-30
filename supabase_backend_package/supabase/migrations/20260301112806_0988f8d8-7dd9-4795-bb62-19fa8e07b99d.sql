
-- Tabla intermedia many-to-many
CREATE TABLE public.evaluation_template_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, position_id)
);

-- Migrar datos existentes
INSERT INTO public.evaluation_template_positions (template_id, position_id)
SELECT id, position_id FROM public.evaluation_templates WHERE position_id IS NOT NULL;

-- Eliminar columna vieja
ALTER TABLE public.evaluation_templates DROP COLUMN IF EXISTS position_id;

-- RLS
ALTER TABLE public.evaluation_template_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template positions for their company"
ON public.evaluation_template_positions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.evaluation_templates et
    WHERE et.id = template_id
    AND et.company_id IN (SELECT public.get_user_company_ids())
  )
);
