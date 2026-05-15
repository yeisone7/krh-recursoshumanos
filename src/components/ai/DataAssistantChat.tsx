/**
 * DataAssistantChat.tsx
 * Componente principal del chat de análisis de datos IA.
 * Renderiza historial de mensajes, input y respuestas enriquecidas.
 */
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { ResponseRenderer } from './ResponseRenderer';
import { SuggestedQuestions } from './SuggestedQuestions';
import {
  useSendDataQuestion,
  useDataAssistantPermission,
  type ChatMessage,
  type DataAssistantResponse,
} from '@/hooks/useDataAssistant';

// ─── Burbuja de mensaje ───────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
      </div>

      {/* Contenido */}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm
        ${isUser
          ? 'bg-primary text-primary-foreground rounded-tr-none'
          : 'bg-card border shadow-sm rounded-tl-none'
        }`}>
        {msg.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Consultando datos…</span>
          </div>
        ) : msg.response ? (
          <ResponseRenderer response={msg.response} showSQL={false} />
        ) : (
          <p className="leading-relaxed">{msg.content}</p>
        )}

        {/* Timestamp */}
        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
          {msg.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ─── Pantalla de acceso denegado ─────────────────────────────

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-amber-500" />
      </div>
      <div>
        <h3 className="font-semibold text-base">Acceso restringido</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          El Asistente de Datos IA requiere activación por parte del administrador.
          Contacta a tu administrador para habilitar este módulo.
        </p>
      </div>
    </div>
  );
}

// ─── DataAssistantChat (principal) ───────────────────────────

export function DataAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const { data: userProfile } = useQuery({
    queryKey: ['ai-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_profiles' as any)
        .select('full_name, display_name')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Lógica robusta para obtener el primer nombre
  const rawName = userProfile?.full_name || userProfile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  
  const cleanName = rawName
    .replace(/[0-9]/g, '') // Quitar números (ej: yeisone7 -> yeisone)
    .replace(/[._-]/g, ' ') // Cambiar puntos/guiones por espacios
    .trim();
    
  const rawFirstName = cleanName.split(' ')[0] || 'Usuario';
  
  // Capitalizar correctamente (YEISON -> Yeison, yeison -> Yeison)
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: hasPermission, isLoading: checkingPerm } = useDataAssistantPermission();
  const sendQuestion = useSendDataQuestion();

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (question: string) => {
    const q = question.trim();
    if (!q || sendQuestion.isPending) return;

    // Limpiar input inmediatamente
    setInput('');

    // Añadir mensaje del usuario
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    };

    // Placeholder de respuesta cargando
    const loadingId = crypto.randomUUID();
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);

    try {
      const result = await sendQuestion.mutateAsync({ 
        question: q, 
        conversationId,
        userName: firstName
      });

      // Actualizar conversationId para persistir hilo
      if (result.conversationId) setConversationId(result.conversationId);

      // Construir respuesta tipada
      const response: DataAssistantResponse = {
        type: result.type,
        data: result.data,
        metadata: result.metadata,
        explanation: result.explanation,
      };

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? { ...m, isLoading: false, response, content: result.explanation }
            : m
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error al procesar la pregunta.';
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? {
                ...m,
                isLoading: false,
                response: {
                  type: 'text',
                  data: null,
                  metadata: null,
                  explanation: errMsg,
                },
                content: errMsg,
              }
            : m
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  // Estados de carga / sin permiso
  if (checkingPerm) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPermission) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <SuggestedQuestions onSelect={q => handleSend(q)} />
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error inline */}
      {sendQuestion.isError && (
        <div className="mx-4 mb-2 flex items-center gap-2 text-sm text-destructive
                        bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {sendQuestion.error instanceof Error
            ? sendQuestion.error.message
            : 'Error de conexión'}
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-background px-4 py-3">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <Textarea
            placeholder="Escribe tu pregunta sobre los datos de la empresa…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="resize-none min-h-[44px] max-h-32 flex-1 text-sm"
            disabled={sendQuestion.isPending}
          />
          <Button
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || sendQuestion.isPending}
          >
            {sendQuestion.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground/60 text-center mt-1.5">
          Solo respondo preguntas sobre datos internos de la plataforma · Max 2000 caracteres
        </p>
      </div>
    </div>
  );
}
