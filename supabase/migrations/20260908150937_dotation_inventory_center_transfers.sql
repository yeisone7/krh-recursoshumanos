-- Keep dotation stock isolated per operation center and make every stock
-- mutation transactional. A NULL operation_center_id represents General.

ALTER TABLE public.dotation_inventory
  DROP CONSTRAINT IF EXISTS dotation_inventory_unique;

ALTER TABLE public.dotation_inventory
  ADD CONSTRAINT dotation_inventory_unique
  UNIQUE NULLS NOT DISTINCT (company_id, operation_center_id, item_type, item_name, size);

ALTER TABLE public.dotation_inventory
  ADD CONSTRAINT dotation_inventory_quantity_nonnegative
  CHECK (quantity_available >= 0),
  ADD CONSTRAINT dotation_inventory_minimum_nonnegative
  CHECK (minimum_stock >= 0);

ALTER TABLE public.operation_centers
  ADD CONSTRAINT operation_centers_id_company_unique UNIQUE (id, company_id);

ALTER TABLE public.dotation_item_types
  ADD CONSTRAINT dotation_item_types_id_company_unique UNIQUE (id, company_id);

ALTER TABLE public.dotation_deliveries
  ADD COLUMN dotation_item_type_id uuid NULL;

UPDATE public.dotation_deliveries delivery
SET dotation_item_type_id = item_type.id
FROM public.dotation_item_types item_type
WHERE item_type.company_id = delivery.company_id
  AND item_type.name = delivery.item_name
  AND delivery.dotation_item_type_id IS NULL;

ALTER TABLE public.dotation_deliveries
  ADD CONSTRAINT dotation_deliveries_item_type_company_fkey
  FOREIGN KEY (dotation_item_type_id, company_id)
  REFERENCES public.dotation_item_types(id, company_id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

CREATE INDEX idx_dotation_deliveries_item_type
  ON public.dotation_deliveries (dotation_item_type_id);

ALTER TABLE public.dotation_inventory
  DROP CONSTRAINT IF EXISTS dotation_inventory_operation_center_id_fkey;

ALTER TABLE public.dotation_inventory
  ADD CONSTRAINT dotation_inventory_center_company_fkey
  FOREIGN KEY (operation_center_id, company_id)
  REFERENCES public.operation_centers (id, company_id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_dotation_inventory_company_center
  ON public.dotation_inventory (company_id, operation_center_id);

CREATE INDEX IF NOT EXISTS idx_dotation_inventory_movements_item
  ON public.dotation_inventory_movements (inventory_item_id, created_at DESC);

ALTER TABLE public.dotation_inventory_movements
  DROP CONSTRAINT IF EXISTS dotation_inventory_movements_movement_type_check;
ALTER TABLE public.dotation_inventory_movements
  ADD CONSTRAINT dotation_inventory_movements_movement_type_check
  CHECK (movement_type IN (
    'entrada', 'salida', 'ajuste', 'entrega', 'devolucion',
    'traslado_entrada', 'traslado_salida'
  ));

CREATE TABLE public.dotation_inventory_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_inventory_id uuid NOT NULL REFERENCES public.dotation_inventory(id) ON DELETE RESTRICT,
  destination_inventory_id uuid NOT NULL REFERENCES public.dotation_inventory(id) ON DELETE RESTRICT,
  source_center_id uuid NULL,
  destination_center_id uuid NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dotation_inventory_transfer_different_centers
    CHECK (source_center_id IS DISTINCT FROM destination_center_id),
  CONSTRAINT dotation_inventory_transfers_source_center_company_fkey
    FOREIGN KEY (source_center_id, company_id)
    REFERENCES public.operation_centers(id, company_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT dotation_inventory_transfers_destination_center_company_fkey
    FOREIGN KEY (destination_center_id, company_id)
    REFERENCES public.operation_centers(id, company_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_dotation_inventory_transfers_company_created
  ON public.dotation_inventory_transfers (company_id, created_at DESC);
CREATE INDEX idx_dotation_inventory_transfers_source_inventory
  ON public.dotation_inventory_transfers (source_inventory_id);
CREATE INDEX idx_dotation_inventory_transfers_destination_inventory
  ON public.dotation_inventory_transfers (destination_inventory_id);

ALTER TABLE public.dotation_inventory_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view accessible inventory transfers"
  ON public.dotation_inventory_transfers
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, source_center_id)
      AND public.check_center_access(company_id, destination_center_id)
    )
  );

-- Inventory rows and their movement history now respect the same center scope
-- used by employees and requisitions. Users without explicit center assignments
-- retain full company scope through check_center_access().
DROP POLICY IF EXISTS "Company members can view inventory" ON public.dotation_inventory;
CREATE POLICY "Company members can view accessible inventory"
  ON public.dotation_inventory
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
    )
  );

DROP POLICY IF EXISTS "Admin/RRHH can insert inventory" ON public.dotation_inventory;
CREATE POLICY "Admin/RRHH can insert accessible inventory"
  ON public.dotation_inventory
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
      )
    )
  );

DROP POLICY IF EXISTS "Admin/RRHH can update inventory" ON public.dotation_inventory;
CREATE POLICY "Admin/RRHH can update accessible inventory"
  ON public.dotation_inventory
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  );

DROP POLICY IF EXISTS "Admin/RRHH can delete inventory" ON public.dotation_inventory;
CREATE POLICY "Admin/RRHH can delete accessible inventory"
  ON public.dotation_inventory
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  );

DROP POLICY IF EXISTS "Company members can view inventory movements" ON public.dotation_inventory_movements;
DROP POLICY IF EXISTS "Role permissions can view inventory movements" ON public.dotation_inventory_movements;
CREATE POLICY "Company members can view accessible inventory movements"
  ON public.dotation_inventory_movements
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.dotation_inventory inventory
      WHERE inventory.id = inventory_item_id
        AND inventory.company_id = dotation_inventory_movements.company_id
        AND public.is_company_member(inventory.company_id)
        AND public.check_center_access(inventory.company_id, inventory.operation_center_id)
    )
  );

CREATE OR REPLACE FUNCTION public.adjust_dotation_inventory(
  p_inventory_id uuid,
  p_adjustment integer,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.dotation_inventory%ROWTYPE;
  v_previous integer;
  v_new integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para ajustar el inventario.' USING ERRCODE = '42501';
  END IF;
  IF p_adjustment = 0 THEN
    RAISE EXCEPTION 'El ajuste debe ser diferente de cero.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_item
  FROM public.dotation_inventory
  WHERE id = p_inventory_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El artículo de inventario no existe.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    public.is_super_admin()
    OR (
      public.is_company_member(v_item.company_id)
      AND public.check_center_access(v_item.company_id, v_item.operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para ajustar este inventario.' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', v_item.company_id::text, v_item.item_type, v_item.item_name, coalesce(v_item.size, '')),
    0
  ));

  SELECT * INTO v_item
  FROM public.dotation_inventory
  WHERE id = p_inventory_id
  FOR UPDATE;

  v_previous := v_item.quantity_available;
  v_new := v_previous + p_adjustment;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %, ajuste solicitado: %.', v_previous, p_adjustment
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.dotation_inventory
  SET quantity_available = v_new, updated_at = now()
  WHERE id = p_inventory_id;

  INSERT INTO public.dotation_inventory_movements (
    company_id, inventory_item_id, movement_type, quantity,
    previous_stock, new_stock, reason, created_by
  ) VALUES (
    v_item.company_id, v_item.id,
    CASE WHEN p_reason = 'devolucion' THEN 'devolucion'
         WHEN p_reason = 'ajuste' THEN 'ajuste'
         WHEN p_adjustment > 0 THEN 'entrada' ELSE 'salida' END,
    abs(p_adjustment), v_previous, v_new, nullif(trim(p_reason), ''), auth.uid()
  );

  RETURN jsonb_build_object(
    'inventory_id', v_item.id,
    'previous_stock', v_previous,
    'new_stock', v_new
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_dotation_inventory(
  p_source_inventory_id uuid,
  p_destination_center_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.dotation_inventory%ROWTYPE;
  v_destination public.dotation_inventory%ROWTYPE;
  v_transfer_id uuid := gen_random_uuid();
  v_destination_name text := 'General';
  v_source_name text := 'General';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para trasladar inventario.' USING ERRCODE = '42501';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad a trasladar debe ser mayor que cero.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_source
  FROM public.dotation_inventory
  WHERE id = p_source_inventory_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El inventario de origen no existe.' USING ERRCODE = 'P0002';
  END IF;
  IF v_source.operation_center_id IS NOT DISTINCT FROM p_destination_center_id THEN
    RAISE EXCEPTION 'El centro de destino debe ser diferente al centro de origen.' USING ERRCODE = '22023';
  END IF;
  IF p_destination_center_id IS NOT NULL THEN
    SELECT name INTO v_destination_name
    FROM public.operation_centers
    WHERE id = p_destination_center_id
      AND company_id = v_source.company_id
      AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El centro de destino no existe, está inactivo o pertenece a otra empresa.' USING ERRCODE = '23503';
    END IF;
  END IF;
  IF v_source.operation_center_id IS NOT NULL THEN
    SELECT name INTO v_source_name
    FROM public.operation_centers
    WHERE id = v_source.operation_center_id;
  END IF;

  IF NOT (
    public.is_super_admin()
    OR (
      public.is_company_member(v_source.company_id)
      AND public.check_center_access(v_source.company_id, v_source.operation_center_id)
      AND public.check_center_access(v_source.company_id, p_destination_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso sobre los centros de origen y destino.' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', v_source.company_id::text, v_source.item_type, v_source.item_name, coalesce(v_source.size, '')),
    0
  ));

  SELECT * INTO v_source
  FROM public.dotation_inventory
  WHERE id = p_source_inventory_id
  FOR UPDATE;

  IF v_source.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente en %. Disponible: %, solicitado: %.',
      v_source_name, v_source.quantity_available, p_quantity USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_destination
  FROM public.dotation_inventory
  WHERE company_id = v_source.company_id
    AND operation_center_id IS NOT DISTINCT FROM p_destination_center_id
    AND item_type = v_source.item_type
    AND item_name = v_source.item_name
    AND size IS NOT DISTINCT FROM v_source.size
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.dotation_inventory (
      company_id, operation_center_id, item_type, item_name, size,
      quantity_available, minimum_stock, created_by
    ) VALUES (
      v_source.company_id, p_destination_center_id, v_source.item_type,
      v_source.item_name, v_source.size, 0, v_source.minimum_stock, auth.uid()
    )
    RETURNING * INTO v_destination;
  END IF;

  UPDATE public.dotation_inventory
  SET quantity_available = quantity_available - p_quantity, updated_at = now()
  WHERE id = v_source.id;

  UPDATE public.dotation_inventory
  SET quantity_available = quantity_available + p_quantity, updated_at = now()
  WHERE id = v_destination.id;

  INSERT INTO public.dotation_inventory_transfers (
    id, company_id, source_inventory_id, destination_inventory_id,
    source_center_id, destination_center_id, quantity, reason, created_by
  ) VALUES (
    v_transfer_id, v_source.company_id, v_source.id, v_destination.id,
    v_source.operation_center_id, p_destination_center_id, p_quantity,
    nullif(trim(p_reason), ''), auth.uid()
  );

  INSERT INTO public.dotation_inventory_movements (
    company_id, inventory_item_id, movement_type, quantity,
    previous_stock, new_stock, reason, reference_id, created_by
  ) VALUES
  (
    v_source.company_id, v_source.id, 'traslado_salida', p_quantity,
    v_source.quantity_available, v_source.quantity_available - p_quantity,
    'Traslado a ' || v_destination_name || coalesce(': ' || nullif(trim(p_reason), ''), ''),
    v_transfer_id, auth.uid()
  ),
  (
    v_source.company_id, v_destination.id, 'traslado_entrada', p_quantity,
    v_destination.quantity_available, v_destination.quantity_available + p_quantity,
    'Traslado desde ' || v_source_name || coalesce(': ' || nullif(trim(p_reason), ''), ''),
    v_transfer_id, auth.uid()
  );

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'source_inventory_id', v_source.id,
    'destination_inventory_id', v_destination.id,
    'source_stock', v_source.quantity_available - p_quantity,
    'destination_stock', v_destination.quantity_available + p_quantity
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_dotation_delivery_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory public.dotation_inventory%ROWTYPE;
  v_employee_company uuid;
  v_center_id uuid;
  v_inventory_enabled boolean := true;
  v_auto_deduct boolean := true;
  v_block_no_stock boolean := false;
  v_previous integer;
  v_deducted integer;
  v_movement record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    FOR v_movement IN
      SELECT movement.inventory_item_id, movement.quantity
      FROM public.dotation_inventory_movements movement
      WHERE movement.reference_id = OLD.id
        AND movement.movement_type = 'entrega'
      ORDER BY movement.inventory_item_id
    LOOP
      SELECT * INTO v_inventory
      FROM public.dotation_inventory
      WHERE id = v_movement.inventory_item_id;
      IF FOUND THEN
        PERFORM pg_advisory_xact_lock(hashtextextended(
          concat_ws('|', v_inventory.company_id::text, v_inventory.item_type, v_inventory.item_name, coalesce(v_inventory.size, '')),
          0
        ));
        SELECT * INTO v_inventory
        FROM public.dotation_inventory
        WHERE id = v_movement.inventory_item_id
        FOR UPDATE;

        v_previous := v_inventory.quantity_available;
        UPDATE public.dotation_inventory
        SET quantity_available = quantity_available + v_movement.quantity, updated_at = now()
        WHERE id = v_inventory.id;

        INSERT INTO public.dotation_inventory_movements (
          company_id, inventory_item_id, movement_type, quantity,
          previous_stock, new_stock, reason, reference_id, created_by
        ) VALUES (
          v_inventory.company_id, v_inventory.id, 'devolucion', v_movement.quantity,
          v_previous, v_previous + v_movement.quantity,
          'Anulación de entrega', OLD.id, auth.uid()
        );
      END IF;
    END LOOP;
    RETURN OLD;
  END IF;

  SELECT employee.company_id INTO v_employee_company
  FROM public.employees_v2 employee
  WHERE employee.id = NEW.employee_id;

  IF v_employee_company IS NULL OR v_employee_company <> NEW.company_id THEN
    RAISE EXCEPTION 'El empleado y la entrega deben pertenecer a la misma empresa.' USING ERRCODE = '23503';
  END IF;

  SELECT work.operation_center_id INTO v_center_id
  FROM public.employee_work_info work
  WHERE work.employee_id = NEW.employee_id
    AND work.company_id = NEW.company_id
    AND work.is_current = true
  ORDER BY work.updated_at DESC NULLS LAST, work.created_at DESC
  LIMIT 1;

  SELECT coalesce((config.config_value ->> 'enabled')::boolean, true)
  INTO v_inventory_enabled
  FROM public.system_config config
  WHERE config.company_id = NEW.company_id
    AND config.config_key = 'dotation_inventory_enabled';

  SELECT coalesce((config.config_value ->> 'enabled')::boolean, true)
  INTO v_auto_deduct
  FROM public.system_config config
  WHERE config.company_id = NEW.company_id
    AND config.config_key = 'dotation_auto_deduct';

  SELECT coalesce((config.config_value ->> 'enabled')::boolean, false)
  INTO v_block_no_stock
  FROM public.system_config config
  WHERE config.company_id = NEW.company_id
    AND config.config_key = 'dotation_block_no_stock';

  v_inventory_enabled := coalesce(v_inventory_enabled, true);
  v_auto_deduct := coalesce(v_auto_deduct, true);
  v_block_no_stock := coalesce(v_block_no_stock, false);

  IF NOT v_inventory_enabled OR NOT v_auto_deduct THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', NEW.company_id::text, NEW.item_type::text, NEW.item_name, coalesce(NEW.size, '')),
    0
  ));

  SELECT * INTO v_inventory
  FROM public.dotation_inventory inventory
  WHERE inventory.company_id = NEW.company_id
    AND inventory.operation_center_id IS NOT DISTINCT FROM v_center_id
    AND (
      inventory.item_type = NEW.dotation_item_type_id::text
      OR (NEW.dotation_item_type_id IS NULL AND inventory.item_name = NEW.item_name)
    )
    AND inventory.item_name = NEW.item_name
    AND inventory.size IS NOT DISTINCT FROM NEW.size
  FOR UPDATE;

  IF NOT FOUND AND v_center_id IS NOT NULL THEN
    SELECT * INTO v_inventory
    FROM public.dotation_inventory inventory
    WHERE inventory.company_id = NEW.company_id
      AND inventory.operation_center_id IS NULL
      AND (
        inventory.item_type = NEW.dotation_item_type_id::text
        OR (NEW.dotation_item_type_id IS NULL AND inventory.item_name = NEW.item_name)
      )
      AND inventory.item_name = NEW.item_name
      AND inventory.size IS NOT DISTINCT FROM NEW.size
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    IF v_block_no_stock THEN
      RAISE EXCEPTION 'No existe inventario para % en el centro del empleado ni en General.', NEW.item_name
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF v_inventory.quantity_available < NEW.quantity AND v_block_no_stock THEN
    RAISE EXCEPTION 'Stock insuficiente para %. Disponible: %, solicitado: %.',
      NEW.item_name, v_inventory.quantity_available, NEW.quantity USING ERRCODE = '23514';
  END IF;

  v_previous := v_inventory.quantity_available;
  v_deducted := least(v_previous, NEW.quantity);
  IF v_deducted = 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.dotation_inventory
  SET quantity_available = quantity_available - v_deducted, updated_at = now()
  WHERE id = v_inventory.id;

  INSERT INTO public.dotation_inventory_movements (
    company_id, inventory_item_id, movement_type, quantity,
    previous_stock, new_stock, reason, reference_id, created_by
  ) VALUES (
    NEW.company_id, v_inventory.id, 'entrega', v_deducted,
    v_previous, v_previous - v_deducted,
    'Entrega a empleado', NEW.id, coalesce(NEW.created_by, auth.uid())
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_dotation_delivery_inventory_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    OLD.employee_id IS DISTINCT FROM NEW.employee_id
    OR OLD.company_id IS DISTINCT FROM NEW.company_id
    OR OLD.item_type IS DISTINCT FROM NEW.item_type
    OR OLD.dotation_item_type_id IS DISTINCT FROM NEW.dotation_item_type_id
    OR OLD.item_name IS DISTINCT FROM NEW.item_name
    OR OLD.size IS DISTINCT FROM NEW.size
    OR OLD.quantity IS DISTINCT FROM NEW.quantity
  ) AND EXISTS (
    SELECT 1
    FROM public.dotation_inventory_movements movement
    WHERE movement.reference_id = OLD.id
      AND movement.movement_type = 'entrega'
  ) THEN
    RAISE EXCEPTION 'No se pueden modificar los datos de inventario de una entrega aplicada. Anula la entrega y créala nuevamente.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_dotation_delivery_inventory_trigger ON public.dotation_deliveries;
CREATE TRIGGER apply_dotation_delivery_inventory_trigger
  AFTER INSERT OR DELETE ON public.dotation_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.apply_dotation_delivery_inventory();

DROP TRIGGER IF EXISTS guard_dotation_delivery_inventory_fields_trigger ON public.dotation_deliveries;
CREATE TRIGGER guard_dotation_delivery_inventory_fields_trigger
  BEFORE UPDATE ON public.dotation_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.guard_dotation_delivery_inventory_fields();

CREATE OR REPLACE FUNCTION public.create_dotation_delivery_batch(
  p_employee_id uuid,
  p_delivery_date date,
  p_expiration_date date,
  p_delivered_by text,
  p_observations text,
  p_items jsonb
)
RETURNS public.dotation_delivery_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_center_id uuid;
  v_transaction public.dotation_delivery_transactions%ROWTYPE;
  v_item jsonb;
  v_quantity integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para registrar la entrega.' USING ERRCODE = '42501';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La entrega debe incluir al menos un artículo.' USING ERRCODE = '22023';
  END IF;
  IF nullif(trim(p_delivered_by), '') IS NULL THEN
    RAISE EXCEPTION 'Debes indicar quién realiza la entrega.' USING ERRCODE = '22023';
  END IF;

  SELECT employee.company_id INTO v_company_id
  FROM public.employees_v2 employee
  WHERE employee.id = p_employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El empleado no existe.' USING ERRCODE = 'P0002';
  END IF;

  SELECT work.operation_center_id INTO v_center_id
  FROM public.employee_work_info work
  WHERE work.employee_id = p_employee_id
    AND work.company_id = v_company_id
    AND work.is_current = true
  ORDER BY work.updated_at DESC NULLS LAST, work.created_at DESC
  LIMIT 1;

  IF NOT (
    public.is_super_admin()
    OR (
      public.is_company_member(v_company_id)
      AND public.check_center_access(v_company_id, v_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para registrar entregas en el centro del empleado.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.dotation_delivery_transactions (
    employee_id, company_id, delivery_date, delivered_by, observations, created_by
  ) VALUES (
    p_employee_id, v_company_id, p_delivery_date, trim(p_delivered_by),
    nullif(trim(p_observations), ''), auth.uid()
  ) RETURNING * INTO v_transaction;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    IF nullif(trim(v_item ->> 'item_name'), '') IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Cada artículo debe tener nombre y una cantidad mayor que cero.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.dotation_deliveries (
      employee_id, company_id, transaction_id, dotation_item_type_id, item_type, item_name,
      quantity, size, delivery_date, expiration_date, delivered_by,
      observations, signature_url, created_by
    ) VALUES (
      p_employee_id, v_company_id, v_transaction.id,
      (v_item ->> 'dotation_item_type_id')::uuid,
      (v_item ->> 'item_type')::public.dotation_item_type,
      trim(v_item ->> 'item_name'), v_quantity,
      nullif(trim(v_item ->> 'size'), ''), p_delivery_date, p_expiration_date,
      trim(p_delivered_by), nullif(trim(p_observations), ''), NULL, auth.uid()
    );
  END LOOP;

  RETURN v_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_dotation_inventory(uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_dotation_inventory(uuid, uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_dotation_delivery_batch(uuid, date, date, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_dotation_inventory(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_dotation_inventory(uuid, uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_dotation_delivery_batch(uuid, date, date, text, text, jsonb) TO authenticated;

COMMENT ON COLUMN public.dotation_inventory.operation_center_id IS
  'Centro de operación propietario del stock. NULL representa el inventario General de la empresa.';
COMMENT ON FUNCTION public.transfer_dotation_inventory(uuid, uuid, integer, text) IS
  'Traslada existencias entre General y centros de operación, o entre centros, en una sola transacción.';
