-- Repair a partial internal-chat deployment in production.
-- The base migration is idempotent; this keeps local migration history aligned
-- with the remote repair applied on 2026-06-05.

CREATE TABLE IF NOT EXISTS public.chat_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_push_subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.chat_conversations,
  public.chat_participants,
  public.chat_messages,
  public.chat_attachments,
  public.chat_reactions,
  public.chat_message_receipts,
  public.chat_push_subscriptions
TO authenticated;

CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = _conversation_id
      AND cp.user_id = _user_id
      AND cp.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.can_chat_in_company(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR (
      public.is_company_member(_company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'chat', 'view')
        OR public.check_user_permission(auth.uid(), 'chat', 'create')
      )
    )
$$;

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

CREATE OR REPLACE FUNCTION public.get_chat_unread_count(_company_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread_count), 0)::INTEGER
  FROM (
    SELECT COUNT(cm.id) AS unread_count
    FROM public.chat_participants cp
    JOIN public.chat_messages cm ON cm.conversation_id = cp.conversation_id
    WHERE cp.user_id = auth.uid()
      AND cp.company_id = _company_id
      AND cp.is_active = true
      AND cm.sender_id <> auth.uid()
      AND cm.created_at > COALESCE(cp.last_read_at, cp.joined_at)
      AND cm.expires_at > now()
    GROUP BY cp.conversation_id
  ) unread;
$$;

REVOKE ALL ON FUNCTION public.is_chat_participant(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_chat_in_company(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_user_company_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_chat_unread_count(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_chat_in_company(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_user_company_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_chat_unread_count(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_chat_in_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_company_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_chat_in_company(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_user_company_member(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_count(UUID) TO service_role;

INSERT INTO public.modules (code, name, icon, sort_order, is_active)
VALUES ('chat', 'Chat Interno', 'MessageCircle', 26, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, seed.action_value::public.permission_action, seed.description_value
FROM public.modules m
CROSS JOIN (
  VALUES
    ('view', 'Chat Interno - Ver'),
    ('create', 'Chat Interno - Crear conversaciones y mensajes'),
    ('update', 'Chat Interno - Editar mensajes propios y preferencias'),
    ('delete', 'Chat Interno - Eliminar mensajes propios')
) AS seed(action_value, description_value)
WHERE m.code = 'chat'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'chat'
ON CONFLICT (role_id, permission_id) DO NOTHING;

DROP POLICY IF EXISTS "Chat conversations are visible to participants" ON public.chat_conversations;
CREATE POLICY "Chat conversations are visible to participants"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR created_by = auth.uid()
  OR public.is_chat_participant(id, auth.uid())
);

DROP POLICY IF EXISTS "Company users can create chat conversations" ON public.chat_conversations;
CREATE POLICY "Company users can create chat conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.can_chat_in_company(company_id)
);

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

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.chat_push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
ON public.chat_push_subscriptions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-media', 'chat-media', false, 104857600)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

NOTIFY pgrst, 'reload schema';
