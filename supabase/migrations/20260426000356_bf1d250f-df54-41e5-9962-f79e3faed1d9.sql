CREATE TABLE public.ai_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'app_help',
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_provider TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_chat_conversations_company_user_last
  ON public.ai_chat_conversations(company_id, user_id, last_message_at DESC);

CREATE INDEX idx_ai_chat_messages_conversation_created
  ON public.ai_chat_messages(conversation_id, created_at);

CREATE POLICY "Users can view own ai conversations"
ON public.ai_chat_conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can create own ai conversations"
ON public.ai_chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can update own ai conversations"
ON public.ai_chat_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND public.is_company_member(company_id))
WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can delete own ai conversations"
ON public.ai_chat_conversations
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can view own ai messages"
ON public.ai_chat_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can create own ai messages"
ON public.ai_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE TRIGGER update_ai_chat_conversations_updated_at
BEFORE UPDATE ON public.ai_chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.modules (code, name, icon, sort_order)
VALUES ('asistente_ia', 'Asistente IA', 'Bot', 28)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, a.action, m.name || ' - ' ||
  CASE a.action
    WHEN 'view' THEN 'Ver'
    WHEN 'create' THEN 'Crear'
    WHEN 'update' THEN 'Modificar'
    WHEN 'delete' THEN 'Eliminar'
  END
FROM public.modules m
CROSS JOIN (VALUES ('view'::permission_action), ('create'::permission_action), ('update'::permission_action), ('delete'::permission_action)) AS a(action)
WHERE m.code = 'asistente_ia'
ON CONFLICT (module_id, action) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'asistente_ia'
ON CONFLICT (role_id, permission_id) DO NOTHING;