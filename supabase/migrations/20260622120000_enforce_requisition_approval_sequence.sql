-- Enforce the requisition approval sequence at the database level.
-- RLS controls who can update rows; this trigger controls which workflow
-- transitions are valid so departments cannot skip approval steps.

CREATE OR REPLACE FUNCTION public.enforce_requisition_approval_sequence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status_old text := OLD.estado_requisicion::text;
  v_status_new text := NEW.estado_requisicion::text;
  v_autoriza text := COALESCE(NEW.autoriza, OLD.autoriza, 'default');
  v_approval_changed boolean :=
    NEW.coordinadores_aprobado IS DISTINCT FROM OLD.coordinadores_aprobado
    OR NEW.rrhh_aprobado IS DISTINCT FROM OLD.rrhh_aprobado
    OR NEW.juridico_aprobado IS DISTINCT FROM OLD.juridico_aprobado
    OR NEW.operaciones_aprobado IS DISTINCT FROM OLD.operaciones_aprobado
    OR NEW.gerencia_aprobado IS DISTINCT FROM OLD.gerencia_aprobado
    OR NEW.seleccion_aprobado IS DISTINCT FROM OLD.seleccion_aprobado;
BEGIN
  IF v_status_old = v_status_new AND NOT v_approval_changed THEN
    RETURN NEW;
  END IF;

  IF v_status_old = 'borrador' AND v_status_new = 'en_coordinadores' AND NOT v_approval_changed THEN
    IF v_autoriza = 'default' THEN
      RAISE EXCEPTION 'No se puede enviar a aprobacion sin definir quien autoriza.'
        USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
  END IF;

  IF v_status_old = 'en_coordinadores' THEN
    IF v_status_new = 'en_rrhh'
       AND NEW.coordinadores_aprobado IS TRUE
       AND OLD.coordinadores_aprobado IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_status_new = 'rechazada'
       AND NEW.coordinadores_aprobado IS FALSE
       AND OLD.coordinadores_aprobado IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_status_old = 'en_rrhh' AND OLD.coordinadores_aprobado IS TRUE THEN
    IF v_status_new = 'en_juridico'
       AND NEW.rrhh_aprobado IS TRUE
       AND OLD.rrhh_aprobado IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_status_new = 'rechazada'
       AND NEW.rrhh_aprobado IS FALSE
       AND OLD.rrhh_aprobado IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_status_old = 'en_juridico' AND OLD.rrhh_aprobado IS TRUE THEN
    IF v_autoriza = 'gerencia_administrativa'
       AND v_status_new = 'en_gerencia'
       AND NEW.juridico_aprobado IS TRUE
       AND OLD.juridico_aprobado IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_autoriza <> 'gerencia_administrativa'
       AND v_status_new = 'en_operaciones'
       AND NEW.juridico_aprobado IS TRUE
       AND OLD.juridico_aprobado IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_status_new = 'rechazada'
       AND NEW.juridico_aprobado IS FALSE
       AND OLD.juridico_aprobado IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_status_old = 'en_operaciones'
     AND OLD.juridico_aprobado IS TRUE
     AND v_autoriza <> 'gerencia_administrativa' THEN
    IF v_autoriza = 'gerencia_operaciones'
       AND v_status_new = 'en_seleccion'
       AND NEW.operaciones_aprobado IS TRUE
       AND OLD.operaciones_aprobado IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_autoriza <> 'gerencia_operaciones'
       AND v_status_new = 'en_gerencia'
       AND NEW.operaciones_aprobado IS TRUE
       AND OLD.operaciones_aprobado IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_status_new = 'rechazada'
       AND NEW.operaciones_aprobado IS FALSE
       AND OLD.operaciones_aprobado IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_status_old = 'en_gerencia'
     AND (
       (v_autoriza = 'gerencia_administrativa' AND OLD.juridico_aprobado IS TRUE)
       OR (v_autoriza <> 'gerencia_administrativa' AND OLD.operaciones_aprobado IS TRUE)
     ) THEN
    IF v_status_new = 'en_seleccion'
       AND NEW.gerencia_aprobado IS TRUE
       AND OLD.gerencia_aprobado IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_status_new = 'rechazada'
       AND NEW.gerencia_aprobado IS FALSE
       AND OLD.gerencia_aprobado IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_status_old = 'en_seleccion'
     AND (
       (v_autoriza = 'gerencia_administrativa' AND OLD.gerencia_aprobado IS TRUE)
       OR (v_autoriza = 'gerencia_operaciones' AND OLD.operaciones_aprobado IS TRUE)
       OR (v_autoriza NOT IN ('gerencia_administrativa', 'gerencia_operaciones') AND OLD.gerencia_aprobado IS TRUE)
     ) THEN
    IF v_status_new = 'aprobada'
       AND NEW.seleccion_aprobado IS TRUE
       AND OLD.seleccion_aprobado IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_status_new = 'rechazada'
       AND NEW.seleccion_aprobado IS FALSE
       AND OLD.seleccion_aprobado IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_status_old = 'aprobada' AND v_status_new = 'cerrada' AND NOT v_approval_changed THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transicion invalida del flujo de aprobacion de requisiciones: % -> %.', v_status_old, v_status_new
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS enforce_requisition_approval_sequence ON public.personnel_requisitions;

CREATE TRIGGER enforce_requisition_approval_sequence
  BEFORE UPDATE ON public.personnel_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_requisition_approval_sequence();
