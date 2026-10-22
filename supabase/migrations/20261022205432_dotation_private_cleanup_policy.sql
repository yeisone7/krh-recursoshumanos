BEGIN;
-- Keep the elevated ownership check outside the exposed API schema.
ALTER FUNCTION public.can_delete_own_unattached_dotation_signature(text) SET SCHEMA dotation_private;
GRANT USAGE ON SCHEMA dotation_private TO authenticated;
-- Existing policy follows the function OID. No table or other function grants.
COMMIT;
