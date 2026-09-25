-- Explicit delivery inventory origin. Older clients retain employee/General routing.
ALTER TABLE public.dotation_deliveries
  ADD COLUMN source_operation_center_id uuid,
  ADD COLUMN inventory_source_selected boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT dotation_deliveries_source_center_company_fkey
    FOREIGN KEY (source_operation_center_id, company_id)
    REFERENCES public.operation_centers(id, company_id),
  ADD CONSTRAINT dotation_deliveries_source_selection_check
    CHECK (inventory_source_selected OR source_operation_center_id IS NULL);

COMMENT ON COLUMN public.dotation_deliveries.inventory_source_selected IS
  'True uses only source_operation_center_id (NULL = General). False preserves legacy automatic selection.';

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

  IF NEW.inventory_source_selected THEN
    v_center_id := NEW.source_operation_center_id;
    IF auth.uid() IS NULL OR NOT (
      public.is_super_admin()
      OR (
        public.is_company_member(NEW.company_id)
        AND public.check_center_access(NEW.company_id, v_center_id)
      )
    ) THEN
      RAISE EXCEPTION 'No tienes permiso para descontar inventario del origen seleccionado.' USING ERRCODE = '42501';
    END IF;
  END IF;

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

  IF NOT FOUND AND v_center_id IS NOT NULL AND NOT NEW.inventory_source_selected THEN
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
      IF NEW.inventory_source_selected THEN
        RAISE EXCEPTION 'No existe inventario para % en el origen seleccionado.', NEW.item_name
          USING ERRCODE = '23514';
      END IF;
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
    OR OLD.inventory_source_selected IS DISTINCT FROM NEW.inventory_source_selected
    OR OLD.source_operation_center_id IS DISTINCT FROM NEW.source_operation_center_id
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
      observations, signature_url, created_by, source_operation_center_id, inventory_source_selected
    ) VALUES (
      p_employee_id, v_company_id, v_transaction.id,
      (v_item ->> 'dotation_item_type_id')::uuid,
      (v_item ->> 'item_type')::public.dotation_item_type,
      trim(v_item ->> 'item_name'), v_quantity,
      nullif(trim(v_item ->> 'size'), ''), p_delivery_date, p_expiration_date,
      trim(p_delivered_by), nullif(trim(p_observations), ''), NULL, auth.uid(),
      (v_item ->> 'source_operation_center_id')::uuid,
      v_item ? 'source_operation_center_id'
    );
  END LOOP;

  RETURN v_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_dotation_delivery_inventory() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_dotation_delivery_inventory_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_dotation_delivery_batch(uuid, date, date, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dotation_delivery_batch(uuid, date, date, text, text, jsonb) TO authenticated;
