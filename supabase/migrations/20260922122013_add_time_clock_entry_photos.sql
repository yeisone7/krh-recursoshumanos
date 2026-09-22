ALTER TABLE public.time_clock_points
  ADD COLUMN require_clock_in_photo boolean NOT NULL DEFAULT false;

ALTER TABLE public.time_clock_events
  ADD COLUMN photo_path text,
  ADD COLUMN photo_captured_at timestamptz,
  ADD CONSTRAINT time_clock_entry_photo_only CHECK (
    (photo_path IS NULL AND photo_captured_at IS NULL)
    OR (action = 'clock_in' AND photo_path IS NOT NULL AND photo_captured_at IS NOT NULL)
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-clock-evidence',
  'time-clock-evidence',
  false,
  2097152,
  ARRAY['image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Authorized staff can view time clock evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'time-clock-evidence'
  AND EXISTS (
    SELECT 1
    FROM public.time_clock_events event
    WHERE event.photo_path = storage.objects.name
      AND public.time_clock_can(event.company_id, 'view')
      AND public.has_employee_v2_access(event.employee_id)
  )
);

-- Resolves the camera policy from a short-lived attendance session. This is
-- callable only by the trusted Edge Function and never exposes employee data.
CREATE FUNCTION public.time_clock_public_photo_policy(_session text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_row time_clock_private.sessions%ROWTYPE;
  point_row public.time_clock_points%ROWTYPE;
BEGIN
  SELECT * INTO session_row
  FROM time_clock_private.sessions
  WHERE token_hash = extensions.digest(coalesce(_session, ''), 'sha256');

  IF session_row.id IS NULL OR session_row.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'SESSION_EXPIRED');
  END IF;

  SELECT * INTO point_row
  FROM public.time_clock_points
  WHERE id = session_row.point_id AND is_active;

  IF point_row.id IS NULL OR (
    session_row.method = 'qr_static'
    AND NOT EXISTS (
      SELECT 1 FROM time_clock_private.links
      WHERE point_id = point_row.id
        AND enabled
        AND version = session_row.link_version
    )
  ) THEN
    RETURN jsonb_build_object('error', 'LINK_UNAVAILABLE');
  END IF;

  RETURN jsonb_build_object(
    'point_id', point_row.id,
    'require_clock_in_photo', point_row.require_clock_in_photo
  );
END;
$$;

-- Keeps the database event and its private photo reference atomic. The file is
-- uploaded first by the Edge Function and removed there if this transaction fails.
CREATE FUNCTION public.time_clock_public_punch(
  _body jsonb,
  _ip_hash text,
  _photo_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_row time_clock_private.sessions%ROWTYPE;
  point_row public.time_clock_points%ROWTYPE;
  result jsonb;
  event_id_value uuid;
BEGIN
  SELECT * INTO session_row
  FROM time_clock_private.sessions
  WHERE token_hash = extensions.digest(coalesce(_body->>'session', ''), 'sha256')
  FOR UPDATE;

  IF session_row.id IS NULL OR session_row.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'SESSION_EXPIRED');
  END IF;

  SELECT * INTO point_row
  FROM public.time_clock_points
  WHERE id = session_row.point_id AND is_active;

  IF point_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'LINK_UNAVAILABLE');
  END IF;

  IF _body->>'action' = 'clock_in' AND point_row.require_clock_in_photo AND _photo_path IS NULL THEN
    RETURN jsonb_build_object('error', 'PHOTO_REQUIRED');
  END IF;

  IF _photo_path IS NOT NULL AND (
    _body->>'action' <> 'clock_in'
    OR NOT point_row.require_clock_in_photo
    OR _photo_path !~ ('^' || point_row.id::text || '/[0-9]{4}/[0-9a-f-]{36}\.jpg$')
  ) THEN
    RETURN jsonb_build_object('error', 'INVALID_PHOTO');
  END IF;

  result := public.time_clock_public('punch', _body, _ip_hash);
  IF result ? 'error' THEN
    RETURN result;
  END IF;

  event_id_value := (result->>'event_id')::uuid;
  IF _photo_path IS NOT NULL AND coalesce((result->>'duplicate')::boolean, false) = false THEN
    UPDATE public.time_clock_events
    SET photo_path = _photo_path,
        photo_captured_at = now()
    WHERE id = event_id_value
      AND employee_id = session_row.employee_id
      AND point_id = point_row.id
      AND action = 'clock_in';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_PHOTO';
    END IF;
  END IF;

  RETURN result || jsonb_build_object('photo_captured', _photo_path IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.time_clock_public_photo_policy(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.time_clock_public_punch(jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.time_clock_public_photo_policy(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.time_clock_public_punch(jsonb, text, text) TO service_role;
