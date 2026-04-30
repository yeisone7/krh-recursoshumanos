
-- Login attempts tracking table for account lockout
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text
);

-- Index for fast lookups by email
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);

-- Auto-cleanup old attempts (older than 24h) via a function
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '24 hours';
$$;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.check_account_locked(p_email text, p_max_attempts int DEFAULT 5, p_lockout_minutes int DEFAULT 15)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_failed_count int;
  v_last_attempt timestamptz;
  v_locked_until timestamptz;
BEGIN
  -- Count failed attempts in the lockout window
  SELECT COUNT(*), MAX(attempted_at) INTO v_failed_count, v_last_attempt
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > now() - (p_lockout_minutes || ' minutes')::interval;

  IF v_failed_count >= p_max_attempts THEN
    v_locked_until := v_last_attempt + (p_lockout_minutes || ' minutes')::interval;
    RETURN json_build_object(
      'locked', true,
      'failed_attempts', v_failed_count,
      'locked_until', v_locked_until,
      'remaining_minutes', EXTRACT(EPOCH FROM (v_locked_until - now())) / 60
    );
  END IF;

  RETURN json_build_object(
    'locked', false,
    'failed_attempts', v_failed_count,
    'remaining_attempts', p_max_attempts - v_failed_count
  );
END;
$$;

-- RLS: login_attempts is managed by security definer functions, allow insert for anon/authenticated
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert login attempts" ON public.login_attempts
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow select own login attempts" ON public.login_attempts
  FOR SELECT TO anon, authenticated
  USING (true);
