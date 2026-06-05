-- Validate target chat participants through a definer helper so RLS on
-- user_company_assignments does not block adding company members to a chat.

CREATE OR REPLACE FUNCTION public.is_user_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_assignments uca
    WHERE uca.user_id = _user_id
      AND uca.company_id = _company_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_user_company_member(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_company_member(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_user_company_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_company_member(UUID, UUID) TO service_role;

DROP POLICY IF EXISTS "Company users can add chat participants" ON public.chat_participants;
CREATE POLICY "Company users can add chat participants"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_chat_in_company(company_id)
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations cc
    WHERE cc.id = conversation_id
      AND cc.company_id = chat_participants.company_id
      AND public.can_chat_in_company(cc.company_id)
  )
  AND public.is_user_company_member(chat_participants.user_id, chat_participants.company_id)
);

NOTIFY pgrst, 'reload schema';
