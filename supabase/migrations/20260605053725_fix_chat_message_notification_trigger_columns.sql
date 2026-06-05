CREATE OR REPLACE FUNCTION public.handle_chat_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    action_url
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
    '/chat?conversation=' || NEW.conversation_id::text
  FROM public.chat_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id <> NEW.sender_id
    AND cp.is_active = true
    AND (cp.muted_until IS NULL OR cp.muted_until < now());

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
