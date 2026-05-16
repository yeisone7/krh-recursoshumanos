-- Función para verificar si un usuario tiene acceso a un centro de operación específico
CREATE OR REPLACE FUNCTION public.check_center_access(p_company_id uuid, p_center_id uuid)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_has_assignments boolean;
BEGIN
    -- 1. Super Admin siempre tiene acceso total
    IF is_super_admin() THEN
        RETURN true;
    END IF;

    -- 2. Verificar si el usuario tiene alguna asignación específica en esta empresa
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_center_assignments uca
        JOIN public.operation_centers oc ON oc.id = uca.operation_center_id
        WHERE uca.user_id = v_user_id
        AND oc.company_id = p_company_id
    ) INTO v_has_assignments;

    -- 3. Si NO tiene asignaciones específicas, tiene acceso a todos los centros de la empresa (si es miembro)
    IF NOT v_has_assignments THEN
        RETURN is_company_member(p_company_id);
    END IF;

    -- 4. Si TIENE asignaciones, debe estar explícitamente asignado al centro solicitado
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_center_assignments 
        WHERE user_id = v_user_id 
        AND operation_center_id = p_center_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar política de SELECT para employees_v2
DROP POLICY IF EXISTS "Users can view accessible employees v2" ON employees_v2;
CREATE POLICY "Users can view accessible employees v2" ON employees_v2
FOR SELECT TO authenticated
USING (
  is_super_admin()
  OR
  (
    is_company_member(company_id)
    AND (
      -- Caso A: El usuario no tiene restricciones de centro en esta empresa
      NOT EXISTS (
        SELECT 1 FROM user_center_assignments uca
        JOIN operation_centers oc ON oc.id = uca.operation_center_id
        WHERE uca.user_id = auth.uid()
        AND oc.company_id = employees_v2.company_id
      )
      OR
      -- Caso B: El empleado pertenece a un centro asignado al usuario
      EXISTS (
        SELECT 1 FROM employee_work_info ewi
        WHERE ewi.employee_id = employees_v2.id
        AND ewi.is_current = true
        AND EXISTS (
          SELECT 1 FROM user_center_assignments uca
          WHERE uca.user_id = auth.uid()
          AND uca.operation_center_id = ewi.operation_center_id
        )
      )
    )
  )
);

-- Actualizar política de SELECT para operation_centers
DROP POLICY IF EXISTS "Users can view accessible centers" ON operation_centers;
CREATE POLICY "Users can view accessible centers" ON operation_centers
FOR SELECT TO authenticated
USING (
  check_center_access(company_id, id)
);

-- Actualizar política de SELECT para employee_work_info
DROP POLICY IF EXISTS "Users can view work info" ON employee_work_info; -- Necesito verificar el nombre exacto
CREATE POLICY "Users can view work info" ON employee_work_info
FOR SELECT TO authenticated
USING (
  check_center_access(company_id, operation_center_id)
);
