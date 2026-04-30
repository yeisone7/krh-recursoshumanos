DROP POLICY IF EXISTS "Users can view own ai conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can create own ai conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can update own ai conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can delete own ai conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can view own ai messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can create own ai messages" ON public.ai_chat_messages;

CREATE POLICY "Users can view own ai conversations"
ON public.ai_chat_conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can create own ai conversations"
ON public.ai_chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can update own ai conversations"
ON public.ai_chat_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()))
WITH CHECK (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can delete own ai conversations"
ON public.ai_chat_conversations
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can view own ai messages"
ON public.ai_chat_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can create own ai messages"
ON public.ai_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));