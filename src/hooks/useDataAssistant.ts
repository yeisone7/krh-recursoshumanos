/**
 * useDataAssistant.ts
 * Hook para el módulo AI Data Assistant.
 * Gestiona llamadas a la Edge Function, historial y estado de conversación.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────

export type DataResponseType = 'text' | 'table' | 'chart' | 'kpi';

export interface DataAssistantResponse {
  type: DataResponseType;
  data: Record<string, unknown>[] | null;
  metadata: {
    row_count: number;
    sql?: string;
    provider?: string;
    suggestedChart?: string;
    sourceTables?: string[];
    sourceSummary?: string;
    suggestedQuestions?: string[];
    intent?: string;
    warnings?: string[];
    cappedAt?: number;
  } | null;
  explanation: string;
  speechText?: string;
  conversationId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: DataAssistantResponse;
  timestamp: Date;
  isLoading?: boolean;
  metadata?: {
    hideText?: boolean;
  };
}

export interface DataConversation {
  id: string;
  title: string;
  last_message_at: string;
}

// ─── Hook principal de envío ──────────────────────────────────

export function useSendDataQuestion() {
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      question,
      conversationId,
      userName,
      isVoice,
    }: {
      question: string;
      conversationId?: string | null;
      userName?: string;
      isVoice?: boolean;
    }): Promise<DataAssistantResponse & { conversationId: string }> => {
      const { data, error } = await supabase.functions.invoke('ai-data-assistant', {
        body: { question, companyId: currentCompanyId, conversationId, userName, isVoice },
      });

      if (error) {
        console.error("[useSendDataQuestion] Invoke error:", error);
        // Supabase invoke error might contain the message from the body
        const bodyError = data?.error || data?.message;
        const msg = bodyError || error.message || 'Error al conectar con el asistente de datos';
        throw new Error(msg);
      }
      
      if (data?.error) throw new Error(data.error);
      return data as DataAssistantResponse & { conversationId: string };
    },
  });
}

// ─── Historial de conversaciones ─────────────────────────────

export function useDataConversations() {
  const { currentCompanyId, user } = useAuth();

  return useQuery({
    queryKey: ['data-conversations', currentCompanyId, user?.id],
    enabled: !!currentCompanyId && !!user?.id,
    queryFn: async (): Promise<DataConversation[]> => {
      const { data, error } = await supabase
        .from('ai_chat_conversations' as never)
        .select('id, title, last_message_at')
        .eq('company_id', currentCompanyId!)
        .eq('user_id', user!.id)
        .eq('mode', 'data_analysis')
        .order('last_message_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as DataConversation[]) ?? [];
    },
  });
}

// ─── Verificar permiso del usuario actual ────────────────────

export function useDataAssistantPermission() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['data-assistant-permission', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      // 1. Verificar si es Super Admin (Acceso total por defecto)
      const { data: superAdmin } = await supabase
        .from('super_admins' as never)
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (superAdmin) return true;

      // 2. Si no es Super Admin, verificar preferencia individual
      const { data } = await supabase
        .from('user_preferences' as never)
        .select('ai_data_assistant_enabled')
        .eq('user_id', user!.id)
        .maybeSingle();

      const prefs = data as { ai_data_assistant_enabled?: boolean } | null;
      return prefs?.ai_data_assistant_enabled ?? false;
    },
  });
}

// ─── Toggle de permiso (para admins) ─────────────────────────

export function useToggleDataAssistantPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      enabled,
    }: {
      userId: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from('user_preferences' as never)
        .upsert(
          { user_id: userId, ai_data_assistant_enabled: enabled },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['data-assistant-permission', variables.userId],
      });
    },
  });
}
