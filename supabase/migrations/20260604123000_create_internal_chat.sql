-- Internal chat: conversations, ephemeral messages, attachments and realtime support.

DO $$
BEGIN
  CREATE TYPE public.chat_conversation_type AS ENUM ('direct', 'group');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.chat_message_type AS ENUM ('text', 'image', 'video', 'audio', 'file', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.chat_receipt_status AS ENUM ('sent', 'delivered', 'read');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.chat_conversation_type NOT NULL DEFAULT 'direct',
  title TEXT NULL,
  avatar_url TEXT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_id UUID NULL,
  last_message_preview TEXT NULL,
  last_message_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_read_at TIMESTAMPTZ NULL,
  muted_until TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL,
  pinned_at TIMESTAMPTZ NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NULL,
  message_type public.chat_message_type NOT NULL DEFAULT 'text',
  reply_to_message_id UUID NULL REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours')
);

CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL DEFAULT 'chat-media',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  duration_seconds NUMERIC NULL,
  width INTEGER NULL,
  height INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours')
);

CREATE TABLE IF NOT EXISTS public.chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.chat_message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.chat_receipt_status NOT NULL DEFAULT 'sent',
  delivered_at TIMESTAMPTZ NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

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

CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_last
  ON public.chat_conversations(company_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_company
  ON public.chat_participants(user_id, company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation
  ON public.chat_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_expires_at
  ON public.chat_messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_expires_at
  ON public.chat_attachments(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_receipts_user_status
  ON public.chat_message_receipts(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message
  ON public.chat_reactions(message_id);

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

REVOKE ALL ON FUNCTION public.get_chat_unread_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_count(UUID) TO authenticated;

INSERT INTO public.modules (code, name, icon, sort_order, is_active)
VALUES ('chat', 'Chat Interno', 'MessageCircle', 26, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, permission_seed.action_value::public.permission_action, permission_seed.description_value
FROM public.modules m
CROSS JOIN (
  VALUES
    ('view', 'Chat Interno - Ver'),
    ('create', 'Chat Interno - Crear conversaciones y mensajes'),
    ('update', 'Chat Interno - Editar mensajes propios y preferencias'),
    ('delete', 'Chat Interno - Eliminar mensajes propios')
) AS permission_seed(action_value, description_value)
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

DROP POLICY IF EXISTS "Participants can update chat conversations" ON public.chat_conversations;
CREATE POLICY "Participants can update chat conversations"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_chat_participant(id, auth.uid())
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_chat_participant(id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can view chat participants" ON public.chat_participants;
CREATE POLICY "Participants can view chat participants"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_chat_participant(conversation_id, auth.uid())
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
  AND EXISTS (
    SELECT 1
    FROM public.user_company_assignments uca
    WHERE uca.user_id = chat_participants.user_id
      AND uca.company_id = chat_participants.company_id
  )
);

DROP POLICY IF EXISTS "Participants can update own chat settings" ON public.chat_participants;
CREATE POLICY "Participants can update own chat settings"
ON public.chat_participants
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR public.is_chat_participant(conversation_id, auth.uid())
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR public.is_chat_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can view chat messages" ON public.chat_messages;
CREATE POLICY "Participants can view chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_chat_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can send chat messages" ON public.chat_messages;
CREATE POLICY "Participants can send chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_chat_participant(conversation_id, auth.uid())
  AND public.can_chat_in_company(company_id)
);

DROP POLICY IF EXISTS "Senders can update own chat messages" ON public.chat_messages;
CREATE POLICY "Senders can update own chat messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR sender_id = auth.uid()
)
WITH CHECK (
  public.is_super_admin()
  OR sender_id = auth.uid()
);

DROP POLICY IF EXISTS "Senders can delete own chat messages" ON public.chat_messages;
CREATE POLICY "Senders can delete own chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR sender_id = auth.uid()
);

DROP POLICY IF EXISTS "Participants can view chat attachments" ON public.chat_attachments;
CREATE POLICY "Participants can view chat attachments"
ON public.chat_attachments
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_chat_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can add chat attachments" ON public.chat_attachments;
CREATE POLICY "Participants can add chat attachments"
ON public.chat_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.is_chat_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can view chat reactions" ON public.chat_reactions;
CREATE POLICY "Participants can view chat reactions"
ON public.chat_reactions
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_chat_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can react to chat messages" ON public.chat_reactions;
CREATE POLICY "Participants can react to chat messages"
ON public.chat_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_chat_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can remove own chat reactions" ON public.chat_reactions;
CREATE POLICY "Users can remove own chat reactions"
ON public.chat_reactions
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Participants can view chat receipts" ON public.chat_message_receipts;
CREATE POLICY "Participants can view chat receipts"
ON public.chat_message_receipts
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_chat_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update own chat receipts" ON public.chat_message_receipts;
CREATE POLICY "Users can update own chat receipts"
ON public.chat_message_receipts
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.chat_push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
ON public.chat_push_subscriptions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  false,
  104857600,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Chat participants can upload media" ON storage.objects;
CREATE POLICY "Chat participants can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND public.is_chat_participant(((storage.foldername(name))[2])::uuid, auth.uid())
  AND public.can_chat_in_company(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Chat participants can view media" ON storage.objects;
CREATE POLICY "Chat participants can view media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    public.is_super_admin()
    OR public.is_chat_participant(((storage.foldername(name))[2])::uuid, auth.uid())
  )
);

DROP POLICY IF EXISTS "Chat uploaders can update media" ON storage.objects;
CREATE POLICY "Chat uploaders can update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND owner = auth.uid()
  AND public.is_chat_participant(((storage.foldername(name))[2])::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'chat-media'
  AND owner = auth.uid()
  AND public.is_chat_participant(((storage.foldername(name))[2])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Chat uploaders can delete media" ON storage.objects;
CREATE POLICY "Chat uploaders can delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    owner = auth.uid()
    OR public.is_super_admin()
  )
  AND public.is_chat_participant(((storage.foldername(name))[2])::uuid, auth.uid())
);

CREATE OR REPLACE FUNCTION public.handle_chat_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  preview TEXT;
BEGIN
  SELECT COALESCE(up.full_name, up.display_name, 'Nuevo mensaje')
  INTO sender_name
  FROM public.user_profiles up
  WHERE up.id = NEW.sender_id;

  preview := CASE
    WHEN NEW.message_type = 'text' THEN COALESCE(NULLIF(trim(NEW.content), ''), 'Mensaje')
    WHEN NEW.message_type = 'image' THEN 'Imagen'
    WHEN NEW.message_type = 'video' THEN 'Video'
    WHEN NEW.message_type = 'audio' THEN 'Nota de voz'
    WHEN NEW.message_type = 'file' THEN 'Archivo'
    ELSE 'Mensaje'
  END;

  UPDATE public.chat_conversations
  SET last_message_id = NEW.id,
      last_message_preview = left(preview, 180),
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;

  INSERT INTO public.chat_message_receipts (message_id, conversation_id, company_id, user_id, status, delivered_at)
  SELECT NEW.id, NEW.conversation_id, NEW.company_id, cp.user_id, 'delivered', now()
  FROM public.chat_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.is_active = true
  ON CONFLICT (message_id, user_id) DO NOTHING;

  INSERT INTO public.notifications (
    user_id,
    company_id,
    title,
    message,
    type,
    category,
    entity_type,
    entity_id,
    action_url,
    event_key,
    priority
  )
  SELECT
    cp.user_id,
    NEW.company_id,
    COALESCE(sender_name, 'Nuevo mensaje'),
    preview,
    'info',
    'chat',
    'chat_message',
    NEW.id,
    '/chat?conversation=' || NEW.conversation_id::text,
    'chat.message.new',
    'info'
  FROM public.chat_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id <> NEW.sender_id
    AND cp.is_active = true
    AND (cp.muted_until IS NULL OR cp.muted_until < now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_message_insert ON public.chat_messages;
CREATE TRIGGER on_chat_message_insert
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_chat_message_insert();

CREATE OR REPLACE FUNCTION public.purge_expired_chat_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM storage.objects so
  USING public.chat_attachments ca
  WHERE so.bucket_id = ca.bucket_id
    AND so.name = ca.storage_path
    AND ca.expires_at <= now();

  DELETE FROM public.chat_messages
  WHERE expires_at <= now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM public.notifications
  WHERE category = 'chat'
    AND created_at <= now() - interval '48 hours';

  UPDATE public.chat_conversations cc
  SET last_message_id = latest.id,
      last_message_preview = latest.preview,
      last_message_at = latest.created_at,
      updated_at = now()
  FROM (
    SELECT DISTINCT ON (cm.conversation_id)
      cm.conversation_id,
      cm.id,
      CASE
        WHEN cm.message_type = 'text' THEN left(COALESCE(NULLIF(trim(cm.content), ''), 'Mensaje'), 180)
        WHEN cm.message_type = 'image' THEN 'Imagen'
        WHEN cm.message_type = 'video' THEN 'Video'
        WHEN cm.message_type = 'audio' THEN 'Nota de voz'
        WHEN cm.message_type = 'file' THEN 'Archivo'
        ELSE 'Mensaje'
      END AS preview,
      cm.created_at
    FROM public.chat_messages cm
    ORDER BY cm.conversation_id, cm.created_at DESC
  ) latest
  WHERE cc.id = latest.conversation_id
    AND (cc.last_message_id IS NULL OR cc.last_message_id <> latest.id);

  UPDATE public.chat_conversations cc
  SET last_message_id = NULL,
      last_message_preview = NULL,
      last_message_at = NULL,
      updated_at = now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_messages cm WHERE cm.conversation_id = cc.id
  )
  AND (cc.last_message_id IS NOT NULL OR cc.last_message_preview IS NOT NULL OR cc.last_message_at IS NOT NULL);

  RETURN deleted_count;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
  ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
  ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
  ALTER TABLE public.chat_reactions REPLICA IDENTITY FULL;
  ALTER TABLE public.chat_message_receipts REPLICA IDENTITY FULL;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_receipts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-chat-messages') THEN
    PERFORM cron.unschedule('purge-expired-chat-messages');
  END IF;

  PERFORM cron.schedule(
    'purge-expired-chat-messages',
    '*/30 * * * *',
    $job$SELECT public.purge_expired_chat_messages();$job$
  );
EXCEPTION
  WHEN undefined_schema OR undefined_table OR undefined_function THEN
    NULL;
END $$;
