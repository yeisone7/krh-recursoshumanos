-- Fix training completion insert policy for public links used by both anonymous and authenticated sessions
DROP POLICY IF EXISTS "Anon can insert completions" ON public.training_completions;

CREATE POLICY "Public can insert completions with valid token"
ON public.training_completions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  token_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.training_access_tokens t
    WHERE t.id = training_completions.token_id
      AND t.is_active = true
      AND t.expires_at > now()
      AND t.company_id = training_completions.company_id
      AND t.course_id = training_completions.course_id
      AND (
        t.usage_type <> 'unico'
        OR COALESCE(t.uses_count, 0) < COALESCE(t.max_uses, 1)
      )
  )
);