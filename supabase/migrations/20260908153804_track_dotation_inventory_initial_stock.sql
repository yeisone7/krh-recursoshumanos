-- Initial quantities are stock mutations too: preserve them in the movement log.
INSERT INTO public.dotation_inventory_movements (
  company_id, inventory_item_id, movement_type, quantity,
  previous_stock, new_stock, reason, created_by, created_at
)
SELECT
  inventory.company_id, inventory.id, 'entrada', inventory.quantity_available,
  0, inventory.quantity_available, 'Stock inicial', inventory.created_by, inventory.created_at
FROM public.dotation_inventory inventory
WHERE inventory.quantity_available > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.dotation_inventory_movements movement
    WHERE movement.inventory_item_id = inventory.id
  );

CREATE OR REPLACE FUNCTION public.record_dotation_inventory_initial_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity_available > 0 THEN
    INSERT INTO public.dotation_inventory_movements (
      company_id, inventory_item_id, movement_type, quantity,
      previous_stock, new_stock, reason, created_by
    ) VALUES (
      NEW.company_id, NEW.id, 'entrada', NEW.quantity_available,
      0, NEW.quantity_available, 'Stock inicial', coalesce(NEW.created_by, auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_dotation_inventory_initial_stock_trigger
  ON public.dotation_inventory;
CREATE TRIGGER record_dotation_inventory_initial_stock_trigger
  AFTER INSERT ON public.dotation_inventory
  FOR EACH ROW EXECUTE FUNCTION public.record_dotation_inventory_initial_stock();

REVOKE ALL ON FUNCTION public.record_dotation_inventory_initial_stock() FROM PUBLIC;
