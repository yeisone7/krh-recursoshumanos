
-- Create dotation_inventory table
CREATE TABLE public.dotation_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id UUID REFERENCES public.operation_centers(id) ON DELETE SET NULL,
  item_type public.dotation_item_type NOT NULL,
  item_name TEXT NOT NULL,
  size TEXT,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dotation_inventory_unique UNIQUE (company_id, operation_center_id, item_type, item_name, size)
);

-- Enable RLS
ALTER TABLE public.dotation_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies: company members can read
CREATE POLICY "Company members can view inventory"
  ON public.dotation_inventory
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

-- Admin/RRHH can insert
CREATE POLICY "Admin/RRHH can insert inventory"
  ON public.dotation_inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- Admin/RRHH can update
CREATE POLICY "Admin/RRHH can update inventory"
  ON public.dotation_inventory
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- Admin/RRHH can delete
CREATE POLICY "Admin/RRHH can delete inventory"
  ON public.dotation_inventory
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- Updated_at trigger
CREATE TRIGGER update_dotation_inventory_updated_at
  BEFORE UPDATE ON public.dotation_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
