-- Trigger functions are internal entry points and must not be callable via API.
REVOKE ALL ON FUNCTION public.apply_dotation_delivery_inventory() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_dotation_delivery_inventory_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_dotation_inventory_initial_stock() FROM PUBLIC, anon, authenticated;
