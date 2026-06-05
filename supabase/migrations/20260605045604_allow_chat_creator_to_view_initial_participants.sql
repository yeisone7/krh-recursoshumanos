-- PostgREST may request inserted rows back. Let a conversation creator see
-- initial participant rows before the creator is already a participant.

DROP POLICY IF EXISTS "Participants can view chat participants" ON public.chat_participants;
CREATE POLICY "Participants can view chat participants"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_chat_participant(conversation_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.chat_conversations cc
    WHERE cc.id = chat_participants.conversation_id
      AND cc.created_by = auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
