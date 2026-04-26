import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Bot, Clock, MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useAiChatConversations,
  useAiChatMessages,
  useDeleteAiChatConversation,
  useSendAiChatMessage,
  type AiChatMessage,
} from '@/hooks/useAiChat';

type ChatMode = 'app_help' | 'data_analysis';

const starterQuestions = [
  '¿Dónde configuro los correos de alertas?',
  '¿Cómo creo una capacitación con IA?',
  '¿Cómo asigno permisos por rol?',
  '¿Dónde veo los contratos próximos a vencer?',
];

const CONFIRM_STEP_MESSAGE = 'Confirmo que completé este paso. Continúa con el siguiente.';

const moduleSuggestions: Record<string, { module: string; moduleLabel: string; suggestions: string[] }> = {
  '/empleados': { module: 'empleados', moduleLabel: 'Empleados', suggestions: ['Registrar un empleado', 'Abrir hoja de vida', 'Revisar datos laborales'] },
  '/contratos': { module: 'contratos', moduleLabel: 'Contratos', suggestions: ['Crear contrato', 'Revisar vencimientos', 'Generar documento'] },
  '/dotacion': { module: 'dotacion', moduleLabel: 'Dotación', suggestions: ['Entregar dotación', 'Ver vencimientos', 'Configurar tipos'] },
  '/examenes': { module: 'examenes', moduleLabel: 'Exámenes', suggestions: ['Registrar examen', 'Revisar vencimientos', 'Consultar profesiograma'] },
  '/alertas': { module: 'alertas', moduleLabel: 'Alertas', suggestions: ['Revisar alertas críticas', 'Gestionar notificaciones', 'Configurar destinatarios'] },
};

function MessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[92%] rounded-lg px-3 py-2.5 text-sm shadow-sm sm:max-w-[88%] sm:px-4 sm:py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-card-foreground'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none text-card-foreground prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:text-card-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AsistenteIA() {
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const forceNextScrollRef = useRef(true);
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<ChatMode>('app_help');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const conversationsQuery = useAiChatConversations(mode);
  const messagesQuery = useAiChatMessages(selectedConversationId);
  const sendMessage = useSendAiChatMessage();
  const deleteConversation = useDeleteAiChatConversation();

  const conversations = useMemo(() => conversationsQuery.data || [], [conversationsQuery.data]);
  const messages = useMemo(() => messagesQuery.data || [], [messagesQuery.data]);
  const lastMessage = messages[messages.length - 1];
  const canConfirmStep = lastMessage?.role === 'assistant' && /paso\s+\d+/i.test(lastMessage.content);
  const pageContext = useMemo(() => {
    const savedPathname = sessionStorage.getItem('krh_last_module_path') || '';
    const pathname = location.pathname === '/asistente-ia' ? savedPathname : location.pathname;
    const match = Object.entries(moduleSuggestions).find(([path]) => pathname.startsWith(path));
    if (!match) return null;
    return { ...match[1], pathname };
  }, [location.pathname]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    const shouldScroll = forceNextScrollRef.current || !isMobile || isNearBottomRef.current;
    if (shouldScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      forceNextScrollRef.current = false;
    }
  }, [messages.length, sendMessage.isPending, selectedConversationId, isMobile]);

  useEffect(() => {
    if (!isMobile || !window.visualViewport) {
      setKeyboardOffset(0);
      return;
    }

    const viewport = window.visualViewport;
    const updateKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset > 80 ? offset : 0);
    };

    updateKeyboardOffset();
    viewport.addEventListener('resize', updateKeyboardOffset);
    viewport.addEventListener('scroll', updateKeyboardOffset);
    return () => {
      viewport.removeEventListener('resize', updateKeyboardOffset);
      viewport.removeEventListener('scroll', updateKeyboardOffset);
    };
  }, [isMobile]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const handleNewConversation = () => {
    forceNextScrollRef.current = true;
    setSelectedConversationId(null);
    setInput('');
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;
  };

  const handleSend = async (text = input) => {
    const message = text.trim();
    if (!message || sendMessage.isPending) return;

    forceNextScrollRef.current = true;
    setInput('');
    try {
      const result = await sendMessage.mutateAsync({
        message,
        conversationId: selectedConversationId,
        mode,
        pageContext,
      });
      setSelectedConversationId(result.conversationId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar la pregunta');
      setInput(message);
    }
  };

  const handleDelete = async (conversationId: string) => {
    try {
      await deleteConversation.mutateAsync(conversationId);
      if (selectedConversationId === conversationId) setSelectedConversationId(null);
      toast.success('Conversación eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la conversación');
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-3 md:h-[calc(100vh-5rem)] md:min-h-[620px] md:gap-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Asistente IA</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Ayuda guiada sobre el uso de KRH con la IA seleccionada en Configuración.</p>
        </div>
        <Button onClick={handleNewConversation} className="w-full gap-2 sm:w-auto">
          <MessageSquarePlus className="h-4 w-4" /> Nueva conversación
        </Button>
      </motion.div>

      <Tabs value={mode} onValueChange={(value) => {
        setMode(value as ChatMode);
        setSelectedConversationId(null);
      }} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="app_help" className="gap-2 text-xs sm:text-sm"><Bot className="h-4 w-4" /> Ayuda de la app</TabsTrigger>
          <TabsTrigger value="data_analysis" disabled className="gap-2 text-xs sm:text-sm"><Sparkles className="h-4 w-4" /> Análisis de datos</TabsTrigger>
        </TabsList>

        <TabsContent value="app_help" className="min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col gap-3 lg:grid lg:grid-cols-[320px_1fr] lg:gap-4">
            <Card className="max-h-44 shrink-0 overflow-hidden lg:max-h-none lg:min-h-0">
              <CardContent className="flex h-full flex-col p-0">
                <div className="border-b border-border p-3 sm:p-4">
                  <p className="font-semibold">Conversaciones</p>
                  <p className="hidden text-sm text-muted-foreground sm:block">Historial personal por empresa</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-1.5 sm:p-2">
                  {conversationsQuery.isLoading ? (
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Aún no tienes conversaciones.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((conversation) => {
                        const active = conversation.id === selectedConversationId;
                        return (
                          <button
                            key={conversation.id}
                            onClick={() => {
                              forceNextScrollRef.current = true;
                              setSelectedConversationId(conversation.id);
                            }}
                            className={cn(
                              'group flex w-full items-start gap-2 rounded-lg p-2.5 text-left transition-colors sm:p-3',
                              active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                            )}
                          >
                            <Bot className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{conversation.title}</span>
                              <span className={cn('mt-1 flex items-center gap-1 text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                                <Clock className="h-3 w-3" /> {new Date(conversation.last_message_at).toLocaleDateString('es-CO')}
                              </span>
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(conversation.id);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.stopPropagation();
                                  handleDelete(conversation.id);
                                }
                              }}
                              className={cn('rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100', active ? 'hover:bg-primary-foreground/15' : 'hover:bg-background')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-0 flex-1 overflow-hidden">
              <CardContent className="flex h-full min-h-0 flex-col p-0">
                <div className="flex items-start justify-between gap-3 border-b border-border p-3 sm:items-center sm:p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{selectedConversation?.title || 'Nueva conversación'}</p>
                    <p className="text-xs text-muted-foreground sm:text-sm">Solo responde preguntas sobre el uso de la app</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">IA configurada</Badge>
                </div>

                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"
                >
                  {messagesQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-3/4" />
                      <Skeleton className="ml-auto h-14 w-2/3" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center sm:gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">¿Qué necesitas hacer en KRH?</p>
                        <p className="mt-1 text-sm text-muted-foreground">El asistente te guía paso a paso dentro de la aplicación.</p>
                      </div>
                      {pageContext && (
                        <div className="w-full max-w-2xl rounded-lg border border-border bg-muted/40 p-3 text-left">
                          <p className="text-sm font-semibold">Sugerencias para {pageContext.moduleLabel}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {pageContext.suggestions.map((suggestion) => (
                              <Button key={suggestion} variant="secondary" size="sm" onClick={() => handleSend(`Estoy en ${pageContext.moduleLabel}. Guíame para: ${suggestion}`)}>
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                        {starterQuestions.map((question) => (
                          <Button key={question} variant="outline" className="h-auto justify-start whitespace-normal py-2.5 text-left sm:py-3" onClick={() => handleSend(question)}>
                            {question}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => <MessageBubble key={message.id} message={message} />)
                  )}
                  {sendMessage.isPending && (
                    <div className="flex justify-start">
                      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                        Pensando...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-border p-3 sm:p-4">
                  {canConfirmStep && !sendMessage.isPending && (
                    <div className="mb-3 flex justify-end">
                      <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => handleSend(CONFIRM_STEP_MESSAGE)}>
                        Confirmar paso y continuar
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Pregunta cómo usar un módulo, configurar una alerta o seguir un proceso..."
                      className="max-h-32 min-h-12 resize-none text-sm"
                      disabled={sendMessage.isPending}
                    />
                    <Button size="icon" className="h-12 w-12 shrink-0" onClick={() => handleSend()} disabled={!input.trim() || sendMessage.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
