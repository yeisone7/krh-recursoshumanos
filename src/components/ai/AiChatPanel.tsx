import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Bot, CheckCircle2, Loader2, MessageSquarePlus, Send, Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSendAiChatMessage, type AiChatMessage, type ChatMode } from '@/hooks/useAiChat';

interface AiChatPanelProps {
  compact?: boolean;
  onClose?: () => void;
}

const starterQuestions = [
  '¿Dónde configuro los correos de alertas?',
  '¿Cómo creo una capacitación con IA?',
  '¿Cómo asigno permisos por rol?',
  '¿Dónde veo los contratos próximos a vencer?',
];

const CONFIRM_STEP_MESSAGE = 'Confirmo que completé este paso. Continúa con el siguiente.';

function splitAssistantMessage(content: string) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const sanitizeGreetingName = (line: string | null) => {
    if (!line) return null;
    const greetingMatch = line.match(/^(\s*[¡!]?(?:hola|buenos días|buenas tardes|buenas noches)\b[\s,¡!]*)(.*)$/iu);
    if (!greetingMatch) return line;

    const [, prefix, rest] = greetingMatch;
    const nameMatch = rest.match(/^([\p{L}ÁÉÍÓÚÜÑáéíóúüñ]+)(.*)$/u);
    if (!nameMatch) return line;

    const [, firstName, suffix] = nameMatch;
    const cleanSuffix = suffix.replace(/^(?:\s+[\p{L}ÁÉÍÓÚÜÑáéíóúüñ'.-]+)+/u, '');
    return `${prefix}${firstName}${cleanSuffix}`.replace(/\s+([!¡?¿.,;:😊🙂✅👉💡⚠️])/u, '$1');
  };
  const greetingIndex = lines.findIndex((line) => /^(?:[¡!]?\s*)?(hola|buenos días|buenas tardes|buenas noches)\b/i.test(line));
  const titleIndex = lines.findIndex((line) => /^#{1,3}\s+/.test(line) || /^paso\s+\d+(\s+de\s+\d+)?/i.test(line));
  const questionIndex = [...lines].reverse().findIndex((line) => /^¿/.test(line) || /\?\s*$/.test(line));
  const confirmationIndex = questionIndex >= 0 ? lines.length - 1 - questionIndex : -1;
  const greeting = sanitizeGreetingName(greetingIndex >= 0 ? lines[greetingIndex] : null);
  const title = titleIndex >= 0 ? lines[titleIndex].replace(/^#{1,3}\s+/, '').replace(/:\s*$/, '') : null;
  const confirmation = confirmationIndex >= 0 && confirmationIndex !== titleIndex ? lines[confirmationIndex] : null;
  const instructions = lines
    .filter((_, index) => index !== greetingIndex && index !== titleIndex && index !== confirmationIndex)
    .join('\n\n')
    .replace(/(^|\n)(\d+\.\s)/g, '$1$2')
    .trim();

  return { greeting, title, instructions, confirmation };
}

const moduleSuggestions: Record<string, { module: string; moduleLabel: string; suggestions: string[] }> = {
  '/empleados': { module: 'empleados', moduleLabel: 'Empleados', suggestions: ['Registrar un empleado', 'Abrir hoja de vida', 'Revisar datos laborales'] },
  '/contratos': { module: 'contratos', moduleLabel: 'Contratos', suggestions: ['Crear contrato', 'Revisar vencimientos', 'Generar documento'] },
  '/dotacion': { module: 'dotacion', moduleLabel: 'Dotación', suggestions: ['Entregar dotación', 'Ver vencimientos', 'Configurar tipos'] },
  '/examenes': { module: 'examenes', moduleLabel: 'Exámenes', suggestions: ['Registrar examen', 'Revisar vencimientos', 'Consultar profesiograma'] },
  '/alertas': { module: 'alertas', moduleLabel: 'Alertas', suggestions: ['Revisar alertas críticas', 'Gestionar notificaciones', 'Configurar destinatarios'] },
};

function MessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === 'user';
  const assistantSections = !isUser ? splitAssistantMessage(message.content) : null;
  const hasAssistantSections = !!(assistantSections?.greeting || assistantSections?.title || assistantSections?.confirmation);

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
          <div className="space-y-3 text-card-foreground">
            {!hasAssistantSections ? (
              <div className="prose prose-sm max-w-none text-card-foreground prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-ol:pl-5 prose-li:my-1.5 prose-li:leading-relaxed prose-strong:text-card-foreground">
                <ReactMarkdown>{message.content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()}</ReactMarkdown>
              </div>
            ) : (
              <>
                {assistantSections?.greeting && (
                  <p className="text-sm leading-relaxed text-card-foreground">
                    {assistantSections.greeting}
                  </p>
                )}
                {assistantSections?.title && (
                  <h3 className="text-base font-semibold leading-snug text-card-foreground sm:text-[1.05rem]">
                    {assistantSections.title}
                  </h3>
                )}
                {assistantSections?.instructions && (
                  <div className="prose prose-sm max-w-none text-card-foreground prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-ol:pl-5 prose-li:my-1.5 prose-li:leading-relaxed prose-strong:text-card-foreground">
                    <ReactMarkdown>{assistantSections.instructions}</ReactMarkdown>
                  </div>
                )}
                {assistantSections?.confirmation && (
                  <div className="border-t border-border pt-3 text-sm font-medium leading-relaxed text-card-foreground">
                    {assistantSections.confirmation}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
    {resetDialog}
    </>
  );
}

export function AiChatPanel({ compact = false, onClose }: AiChatPanelProps) {
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const forceNextScrollRef = useRef(true);
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<ChatMode>('app_help');
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const sendMessage = useSendAiChatMessage();
  const lastMessage = messages[messages.length - 1];
  const currentStepMatch = lastMessage?.role === 'assistant' ? lastMessage.content.match(/paso\s+(\d+)(?:\s+de\s+(\d+))?/i) : null;
  const currentStepLabel = currentStepMatch ? `Paso ${currentStepMatch[1]}${currentStepMatch[2] ? ` de ${currentStepMatch[2]}` : ''}` : null;
  const canConfirmStep = !!currentStepLabel;
  const assistantStatus = sendMessage.isPending ? 'Escribiendo' : 'Listo';
  const AssistantStatusIcon = sendMessage.isPending ? Loader2 : CheckCircle2;
  const pageContext = useMemo(() => {
    const savedPathname = sessionStorage.getItem('krh_last_module_path') || '';
    const pathname = location.pathname === '/asistente-ia' ? savedPathname : location.pathname;
    const match = Object.entries(moduleSuggestions).find(([path]) => pathname.startsWith(path));
    if (!match) return null;
    return { ...match[1], pathname, isActiveModule: location.pathname !== '/asistente-ia' };
  }, [location.pathname]);

  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior });
    });
  };

  useEffect(() => {
    const shouldScroll = forceNextScrollRef.current || !isMobile || isNearBottomRef.current;
    if (shouldScroll) {
      scrollMessagesToBottom('smooth');
      forceNextScrollRef.current = false;
    }
  }, [messages.length, sendMessage.isPending, isMobile]);

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

  const resetConversation = () => {
    forceNextScrollRef.current = true;
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setInput('');
    setResetDialogOpen(false);
  };

  const handleNewConversation = () => {
    if (messages.length === 0 && !input.trim()) {
      resetConversation();
      return;
    }
    setResetDialogOpen(true);
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
      const userMessage: AiChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: sessionId,
        company_id: '',
        user_id: '',
        role: 'user',
        content: message,
        ai_provider: null,
        metadata: { temporary: true },
        created_at: new Date().toISOString(),
      };
      const history = messages.map(({ role, content }) => ({ role, content }));
      setMessages((current) => [...current, userMessage]);
      const result = await sendMessage.mutateAsync({
        message,
        history,
        mode,
        pageContext,
      });
      setMessages((current) => [...current, { ...result.message, conversation_id: sessionId }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar la pregunta');
      setMessages((current) => current.filter((item) => !(item.role === 'user' && item.content === message && item.conversation_id === sessionId)));
      setInput(message);
    }
  };

  const chatHeader = (
    <div className="flex items-start justify-between gap-3 border-b border-border p-3 sm:items-center sm:p-4">
      <div className="min-w-0">
        <p className="truncate font-semibold">Conversación temporal</p>
        <p className="text-xs text-muted-foreground sm:text-sm">Disponible hasta cerrar el chat</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant="outline" className="gap-1.5 text-[10px] sm:text-xs">
          <AssistantStatusIcon className={cn('h-3 w-3', sendMessage.isPending && 'animate-spin')} />
          {assistantStatus}
        </Badge>
        {compact && onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Minimizar asistente">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const emptyState = (
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
  );

  const chatBody = (
    <>
      {chatHeader}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"
      >
        {false ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="ml-auto h-14 w-2/3" />
          </div>
        ) : messages.length === 0 ? (
          emptyState
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {sendMessage.isPending && (
          <div className="flex justify-start">
            <div className="flex max-w-[92%] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground shadow-sm sm:max-w-[88%] sm:px-4 sm:py-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <span className="truncate">Escribiendo...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="border-t border-border bg-card p-3 transition-[padding-bottom] duration-200 sm:p-4"
        style={isMobile && keyboardOffset ? { paddingBottom: `calc(${keyboardOffset}px + 0.75rem)` } : undefined}
      >
        {canConfirmStep && !sendMessage.isPending && (
          <div className="mb-3 flex justify-end">
            <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => handleSend(CONFIRM_STEP_MESSAGE)}>
              {currentStepLabel} · continuar
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (isMobile || !event.shiftKey)) {
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
    </>
  );

  const resetDialog = (
    <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Iniciar una conversación nueva</AlertDialogTitle>
          <AlertDialogDescription>
            La conversación actual es temporal y no se guarda. Si continúas, se borrará lo que ves en este chat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={resetConversation}>Iniciar nueva</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (compact) {
    return (
      <>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card text-card-foreground">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Asistente IA</h2>
            <p className="truncate text-xs text-muted-foreground">Resuelvo tus dudas sobre el uso de la plataforma.</p>
          </div>
          <Button variant="secondary" size="sm" className="h-8 gap-1.5 px-2.5" onClick={handleNewConversation}>
            <MessageSquarePlus className="h-3.5 w-3.5" /> Nueva
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {chatBody}
        </div>
        </div>
        {resetDialog}
      </>
    );
  }

  return (
    <>
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-3 md:h-[calc(100vh-5rem)] md:min-h-[620px] md:gap-4 md:overflow-hidden">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
        resetConversation();
      }} className="flex min-h-0 flex-1 flex-col overflow-visible md:overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="app_help" className="gap-2 text-xs sm:text-sm"><Bot className="h-4 w-4" /> Ayuda de la app</TabsTrigger>
          <TabsTrigger value="data_analysis" disabled className="gap-2 text-xs sm:text-sm"><Sparkles className="h-4 w-4" /> Análisis de datos</TabsTrigger>
        </TabsList>

        <TabsContent value="app_help" className="min-h-0 flex-1">
          <Card className="h-[calc(100dvh-16rem)] min-h-[430px] flex-1 overflow-hidden md:h-full md:min-h-0">
            <CardContent className="flex h-full min-h-0 flex-col p-0">
              {chatBody}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
