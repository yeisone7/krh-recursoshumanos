
-- Table to track all inventory stock movements
CREATE TABLE public.dotation_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  inventory_item_id UUID NOT NULL REFERENCES public.dotation_inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste', 'entrega', 'devolucion')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL DEFAULT 0,
  new_stock INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  reference_id UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_inventory_movements_item ON public.dotation_inventory_movements(inventory_item_id);
CREATE INDEX idx_inventory_movements_company ON public.dotation_inventory_movements(company_id);
CREATE INDEX idx_inventory_movements_created ON public.dotation_inventory_movements(created_at DESC);

-- RLS
ALTER TABLE public.dotation_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view inventory movements"
  ON public.dotation_inventory_movements
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can insert inventory movements"
  ON public.dotation_inventory_movements
  FOR INSERT
  WITH CHECK (public.is_admin_or_rrhh());
