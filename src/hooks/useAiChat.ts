import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ChatMode = 'app_help' | 'data_analysis';
type ChatRole = 'user' | 'assistant';

export interface AiChatPageContext {
  module: string;
  moduleLabel: string;
  pathname: string;
  isActiveModule?: boolean;
}

export interface AiChatConversation {
  id: string;
  company_id: string;
  user_id: string;
  mode: ChatMode;
  title: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
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

export function useAiChatConversations(mode: ChatMode = 'app_help') {
  const { currentCompanyId, user } = useAuth();

  return useQuery({
    queryKey: ['ai-chat-conversations', currentCompanyId, user?.id, mode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_chat_conversations' as never)
        .select('*')
        .eq('company_id', currentCompanyId)
        .eq('user_id', user?.id)
        .eq('mode', mode)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AiChatConversation[];
    },
    enabled: !!currentCompanyId && !!user?.id,
  });
}

export function useAiChatMessages(conversationId: string | null) {
  const { currentCompanyId, user } = useAuth();

  return useQuery({
    queryKey: ['ai-chat-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_chat_messages' as never)
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('company_id', currentCompanyId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as AiChatMessage[];
    },
    enabled: !!conversationId && !!currentCompanyId && !!user?.id,
  });
}

export function useSendAiChatMessage() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      message,
      conversationId,
      mode = 'app_help',
      pageContext,
    }: {
      message: string;
      conversationId?: string | null;
      mode?: ChatMode;
      pageContext?: AiChatPageContext | null;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message,
          conversationId,
          mode,
          companyId: currentCompanyId,
          pageContext,
          userDisplayName: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { conversationId: string; message: AiChatMessage; provider: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-messages', data.conversationId] });
    },
  });
}

export function useDeleteAiChatConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('ai_chat_conversations' as never)
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-chat-conversations'] });
    },
  });
}
