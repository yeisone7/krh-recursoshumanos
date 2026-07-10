-- Remove the legacy SELECT policy that bypasses confidential requisition
-- checks by allowing reads with center access only.

DROP POLICY IF EXISTS "Users can view accessible requisitions"
  ON public.personnel_requisitions;

DROP POLICY IF EXISTS "Users can view requisitions from their company"
  ON public.personnel_requisitions;

CREATE POLICY "Users can view requisitions from their company"
  ON public.personnel_requisitions
  FOR SELECT TO authenticated
  USING (
    public.user_can_read_requisition(
      company_id,
      operation_center_id,
      is_confidential,
      created_by,
      solicitante_id,
      estado_requisicion::text
    )
  );
