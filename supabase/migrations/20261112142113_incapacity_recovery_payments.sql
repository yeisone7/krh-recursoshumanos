ALTER TABLE public.employee_incapacities
  ADD COLUMN recovery_payments jsonb;

COMMENT ON COLUMN public.employee_incapacities.recovery_payments IS
  'Actual payments for this certificate. NULL retains the legacy amount and date; [] means no payments.';

CREATE FUNCTION public.sync_incapacity_recovery_payments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  payment jsonb;
  payment_amount numeric;
  payment_date date;
  total_received numeric := 0;
  latest_date date;
  undated_amount numeric;
  undated_seen boolean := false;
BEGIN
  IF NEW.recovery_payments IS NULL THEN
    IF TG_OP = 'UPDATE' AND OLD.recovery_payments IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Use una lista vacía para quitar todos los abonos.';
    END IF;
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.recovery_payments) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Los abonos deben enviarse como una lista.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.recovery_payments IS NULL AND OLD.actual_payment_date IS NULL THEN
      undated_amount := OLD.recovered_amount;
    ELSIF OLD.recovery_payments IS NOT NULL THEN
      SELECT (value ->> 'amount')::numeric INTO undated_amount
      FROM jsonb_array_elements(OLD.recovery_payments)
      WHERE value -> 'date' = 'null'::jsonb;
    END IF;
  END IF;

  FOR payment IN SELECT value FROM jsonb_array_elements(NEW.recovery_payments) LOOP
    IF jsonb_typeof(payment) IS DISTINCT FROM 'object'
      OR jsonb_typeof(payment -> 'amount') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Cada abono debe incluir un valor numérico.';
    END IF;

    payment_amount := (payment ->> 'amount')::numeric;
    IF payment_amount <= 0 OR payment_amount <> round(payment_amount, 2) THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'El valor del abono debe ser positivo y tener hasta dos decimales.';
    END IF;

    IF payment -> 'date' = 'null'::jsonb THEN
      IF undated_seen OR payment_amount IS DISTINCT FROM undated_amount THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Cada abono nuevo o corregido requiere una fecha de pago.';
      END IF;
      undated_seen := true;
    ELSE
      IF jsonb_typeof(payment -> 'date') IS DISTINCT FROM 'string'
        OR (payment ->> 'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'La fecha de pago debe usar el formato AAAA-MM-DD.';
      END IF;
      payment_date := (payment ->> 'date')::date;
      latest_date := greatest(latest_date, payment_date);
    END IF;

    total_received := total_received + payment_amount;
  END LOOP;

  IF total_received > 9999999999.99 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'El total recibido excede el valor máximo permitido.';
  END IF;

  NEW.recovered_amount := total_received;
  NEW.actual_payment_date := latest_date;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_incapacity_recovery_payments
  BEFORE INSERT OR UPDATE OF recovery_payments, recovered_amount, actual_payment_date
  ON public.employee_incapacities
  FOR EACH ROW EXECUTE FUNCTION public.sync_incapacity_recovery_payments();
