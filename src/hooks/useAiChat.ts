import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ChatMode = 'app_help' | 'data_analysis';
type ChatRole = 'user' | 'assistant';

export interface AiChatPageContext {
  module: string;
  moduleLabel: string;
  pathname: string;
  isActiveModule?: boolean;
}

export interface AiChatMessage {
  id: string;
  conversation_id: string;
  company_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  ai_provider: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useSendAiChatMessage() {
  const { currentCompanyId, companies, user } = useAuth();

  const getUserDisplayName = async () => {
    if (!user?.id) return undefined;

    const cleanName = (value?: string | null) => {
      const text = value?.trim();
      if (!text || text.includes('@')) return undefined;
      return text.split(/\s+/)[0];
    };

    const { data } = await supabase
      .from('user_profiles' as never)
      .select('full_name, display_name')
      .eq('id', user.id)
      .maybeSingle();

    const profile = data as { full_name?: string | null; display_name?: string | null } | null;
    return cleanName(profile?.full_name) || cleanName(profile?.display_name) || cleanName(user.user_metadata?.full_name) || cleanName(user.user_metadata?.name);
  };

  return useMutation({
    mutationFn: async ({
      message,
      history = [],
      mode = 'app_help',
      pageContext,
    }: {
      message: string;
      history?: Array<Pick<AiChatMessage, 'role' | 'content'>>;
      mode?: ChatMode;
      pageContext?: AiChatPageContext | null;
    }) => {
      const userDisplayName = await getUserDisplayName();
      const targetCompanyId = currentCompanyId || companies[0]?.id;

      if (!targetCompanyId) {
        throw new Error('Selecciona una empresa antes de usar el asistente IA.');
      }

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message,
          history: history.slice(-30),
          mode,
          companyId: targetCompanyId,
          pageContext,
          userDisplayName,
        },
      });

      if (error) {
        const functionError = error as any;
        const context = functionError.context;
        if (context?.json) {
          try {
            const body = await context.json();
            if (body?.error) throw new Error(body.error);
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
              throw parseError;
            }
          }
        }
        throw new Error(functionError.message || 'No se pudo conectar con el asistente IA.');
      }
      if (data?.error) throw new Error(data.error);
      return data as { conversationId: string; message: AiChatMessage; provider: string };
    },
  });
}
