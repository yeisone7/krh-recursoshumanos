
-- Create dotation_profesiograma table
CREATE TABLE public.dotation_profesiograma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id UUID NOT NULL REFERENCES public.operation_centers(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, operation_center_id, position_id)
);

-- Create dotation_profesiograma_items table
CREATE TABLE public.dotation_profesiograma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesiograma_id UUID NOT NULL REFERENCES public.dotation_profesiograma(id) ON DELETE CASCADE,
  dotation_item_type_id UUID NOT NULL REFERENCES public.dotation_item_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profesiograma_id, dotation_item_type_id)
);

-- Enable RLS
ALTER TABLE public.dotation_profesiograma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dotation_profesiograma_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for dotation_profesiograma
CREATE POLICY "Company members can view profesiogramas"
  ON public.dotation_profesiograma
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can insert profesiogramas"
  ON public.dotation_profesiograma
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "Admin/RRHH can update profesiogramas"
  ON public.dotation_profesiograma
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "Admin/RRHH can delete profesiogramas"
  ON public.dotation_profesiograma
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- RLS policies for dotation_profesiograma_items (access through parent)
CREATE POLICY "Members can view profesiograma items"
  ON public.dotation_profesiograma_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dotation_profesiograma dp
    WHERE dp.id = profesiograma_id AND public.is_company_member(dp.company_id)
  ));

CREATE POLICY "Admin/RRHH can insert profesiograma items"
  ON public.dotation_profesiograma_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dotation_profesiograma dp
    WHERE dp.id = profesiograma_id AND public.is_company_member(dp.company_id) AND public.is_admin_or_rrhh()
  ));

CREATE POLICY "Admin/RRHH can update profesiograma items"
  ON public.dotation_profesiograma_items
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dotation_profesiograma dp
    WHERE dp.id = profesiograma_id AND public.is_company_member(dp.company_id) AND public.is_admin_or_rrhh()
  ));

CREATE POLICY "Admin/RRHH can delete profesiograma items"
  ON public.dotation_profesiograma_items
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dotation_profesiograma dp
    WHERE dp.id = profesiograma_id AND public.is_company_member(dp.company_id) AND public.is_admin_or_rrhh()
  ));

-- Updated_at trigger
CREATE TRIGGER update_dotation_profesiograma_updated_at
  BEFORE UPDATE ON public.dotation_profesiograma
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
