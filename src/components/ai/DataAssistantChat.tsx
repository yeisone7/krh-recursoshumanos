/**
 * DataAssistantChat.tsx
 * Componente principal del chat de análisis de datos IA.
 * Renderiza historial de mensajes, input y respuestas enriquecidas.
 */
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Lock, Mic, Volume2, VolumeX, AudioLines, PlusCircle, ShieldCheck } from 'lucide-react';
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

const MAX_QUESTION_LENGTH = 2000;

// ─── Burbuja de mensaje ───────────────────────────────────────

function MessageBubble({ msg, onSpeak, isSpeaking }: { msg: ChatMessage, onSpeak: (text: string) => void, isSpeaking: boolean }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
      </div>

      {/* Contenido */}
      <div className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm
        ${isUser
          ? 'bg-primary text-primary-foreground rounded-tr-none'
          : 'bg-card border shadow-sm rounded-tl-none'
        }`}>
        
        {/* Botón de Voz para respuestas de la IA */}
        {!isUser && msg.response && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-10 top-0 h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            onClick={() => onSpeak(msg.response?.speechText || msg.response?.explanation || '')}
            title={isSpeaking ? "Detener lectura" : "Escuchar respuesta"}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        )}
        {msg.isLoading || msg.metadata?.hideText ? (
          <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
            <AudioLines className="w-4 h-4 animate-bounce" />
            <span>La IA está hablando...</span>
          </div>
        ) : msg.response ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ResponseRenderer response={msg.response} showSQL={false} />
          </div>
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
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // ─── Configuración de Voz (STT) ───
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-CO';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (isHandsFree) {
            handleSend(transcript);
          } else {
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
          }
        }
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        // Interrupción: si empezamos a hablar, paramos lo que la IA esté diciendo
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setSpeakingMsgId(null);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [isHandsFree]); // Re-vincular cuando cambie el modo

  // Iniciar reconocimiento automáticamente en modo manos libres
  useEffect(() => {
    if (isHandsFree && !isListening && !speakingMsgId && !sendQuestion.isPending) {
      const timer = setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (e) {}
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isHandsFree, isListening, speakingMsgId, sendQuestion.isPending]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition', err);
      }
    }
  };

  // ─── Configuración de Lectura (TTS) ───
  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F3FB}-\u{1F3FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Quitar emojis
      .replace(/```[\s\S]*?```/g, '') // Quitar bloques de código
      .replace(/`.*?`/g, '') // Quitar código en línea
      .replace(/\*\*(.*?)\*\*/g, '$1') // Quitar negritas
      .replace(/\*(.*?)\*/g, '$1') // Quitar cursivas
      .replace(/#+\s/g, '') // Quitar encabezados
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Quitar links (dejar solo el texto)
      .replace(/[|\\-]/g, ' ') // Quitar barras y guiones de tablas
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  };

  const stopAllSpeech = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setSpeakingMsgId(null);
    // Asegurarse de que ningún mensaje se quede oculto si detenemos la voz
    setMessages(prev => prev.map(m => 
      m.metadata?.hideText ? { ...m, metadata: { ...m.metadata, hideText: false } } : m
    ));
  };

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      stopAllSpeech();
    };
  }, []);

  const handleSpeak = async (text: string, msgId: string, onEnd?: () => void) => {
    // Si ya estamos hablando este mensaje, lo detenemos
    if (speakingMsgId === msgId) {
      stopAllSpeech();
      return;
    }

    // Parar cualquier cosa previa antes de empezar una nueva
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    setSpeakingMsgId(msgId);

    try {
      // 1. Intentar usar OpenAI TTS (Voz Natural Pro)
      const { data, error } = await supabase.functions.invoke('ai-text-to-speech', {
        body: { text: cleanedText, voice: 'shimmer' }
      });

      if (error) throw error;

      if (data) {
        const audioUrl = URL.createObjectURL(data);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setSpeakingMsgId(null);
          if (onEnd) onEnd();
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          console.error("Audio playback error");
          setSpeakingMsgId(null);
          if (onEnd) onEnd();
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('[TTS] Fallback a voz nativa:', err);
      
      // 2. Fallback a voz nativa (Browser)
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      const voices = window.speechSynthesis.getVoices();
      
      const femaleVoice = 
        voices.find(v => v.lang.startsWith('es') && (v.name.includes('Helena') || v.name.includes('Sabina') || v.name.includes('Laura') || v.name.includes('Luciana') || v.name.includes('Google') && !v.name.includes('Male'))) ||
        voices.find(v => v.lang.startsWith('es') && (v.name.includes('Female') || v.name.includes('Mujer'))) ||
        voices.find(v => v.name.includes('Google') && (v.lang.startsWith('es-ES') || v.lang.startsWith('es-419'))) ||
        voices.find(v => v.name.includes('Microsoft') && v.lang.startsWith('es')) ||
        voices.find(v => v.lang.startsWith('es-CO')) ||
        voices.find(v => v.lang.startsWith('es'));

      if (femaleVoice) utterance.voice = femaleVoice;
      else utterance.lang = 'es-CO';

      utterance.onend = () => {
        setSpeakingMsgId(null);
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        setSpeakingMsgId(null);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // El auto-lectura se maneja directamente en handleSend para evitar duplicados
  // Solo mantenemos handleSpeak para uso manual o por el trigger de handleSend

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (question: string) => {
    const q = question.trim();
    if (!q || sendQuestion.isPending) return;
    if (q.length > MAX_QUESTION_LENGTH) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `La pregunta supera el limite de ${MAX_QUESTION_LENGTH} caracteres. Resume el alcance o divide el analisis en varias preguntas.`,
          timestamp: new Date(),
        },
      ]);
      return;
    }

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
    setIsThinking(true);

    try {
      const result = await sendQuestion.mutateAsync({ 
        question: q, 
        conversationId,
        userName: firstName,
        isVoice: isHandsFree
      });

      setIsThinking(false);
      // Actualizar conversationId para persistir hilo
      if (result.conversationId) setConversationId(result.conversationId);

      // Construir respuesta tipada
      const response: DataAssistantResponse = {
        type: result.type,
        data: result.data,
        metadata: result.metadata,
        explanation: result.explanation,
        speechText: result.speechText,
      };

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? { 
                ...m, 
                isLoading: false, 
                response, 
                content: result.explanation,
                // Si es voz, ocultamos el texto inicialmente para dar prioridad a la voz
                metadata: { ...m.metadata, hideText: isHandsFree } 
              }
            : m
        )
      );

      // Si es modo manos libres, disparamos la voz inmediatamente
      if (isHandsFree) {
        handleSpeak(
          result.speechText || result.explanation, 
          loadingId,
          () => {
            // Callback que se dispara cuando el audio TERMINA de sonar
            // Esto cumple con "primero responda en voz y luego muestre el texto"
            setMessages(prev => prev.map(m => 
              m.id === loadingId ? { ...m, metadata: { ...m.metadata, hideText: false } } : m
            ));
          }
        );
      }
    } catch (err: any) {
      setIsThinking(false);
      
      // Intentar extraer el mensaje de error del cuerpo de la respuesta si es posible
      let errorMessage = "Lo siento, ocurrió un error inesperado. Por favor, intenta de nuevo.";
      
      if (err.response) {
        try {
          const errorData = await err.response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Si no se puede parsear, usar el status text
          errorMessage = `Error del servidor (${err.response.status}): ${err.response.statusText}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? {
                ...m,
                content: errorMessage,
                isLoading: false,
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
    <div className="flex flex-col h-full relative">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">Consultas de solo lectura, filtradas por empresa y tablas autorizadas.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={() => {
            stopAllSpeech();
            setMessages([]);
            setConversationId(null);
            setInput('');
          }}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Nuevo chat
        </Button>
      </div>

      {/* Indicadores de Voz (Flotantes) - Feedback Pro */}
      {(isListening || isThinking || speakingMsgId) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
          {isListening && (
            <div 
              className="bg-primary px-5 py-2.5 rounded-full shadow-[0_10px_40px_rgba(var(--primary),0.4)] 
                              flex items-center gap-4 border border-primary-foreground/30 backdrop-blur-xl
                              animate-in fade-in zoom-in slide-in-from-top-4 duration-300 pointer-events-auto cursor-pointer"
              onClick={() => toggleListening()}
            >
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
              </div>
              <span className="text-[12px] font-extrabold tracking-widest uppercase text-white drop-shadow-sm">
                Escuchando...
              </span>
            </div>
          )}
          {isThinking && (
            <div className="bg-card/95 px-5 py-2.5 rounded-full shadow-2xl shadow-primary/10
                            flex items-center gap-4 border border-primary/20 backdrop-blur-xl
                            animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-[12px] font-extrabold tracking-widest uppercase text-primary/80">
                Analizando Datos...
              </span>
            </div>
          )}
          {speakingMsgId && !isListening && !isThinking && (
            <div 
              className="bg-card/95 px-5 py-2.5 rounded-full shadow-2xl shadow-primary/10
                              flex items-center gap-4 border border-primary/20 backdrop-blur-xl
                              animate-in fade-in zoom-in slide-in-from-top-4 duration-300 pointer-events-auto cursor-pointer
                              hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/20 transition-all group"
              onClick={() => stopAllSpeech()}
              title="Detener voz"
            >
              <AudioLines className="w-5 h-5 text-primary animate-pulse group-hover:text-destructive-foreground" />
              <span className="text-[12px] font-extrabold tracking-widest uppercase text-primary/80 group-hover:text-destructive-foreground">
                IA Hablando (Click para parar)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Área de mensajes */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 transition-all duration-300 ${(isListening || speakingMsgId) ? 'opacity-90' : 'opacity-100'}`}>
        {messages.length === 0 ? (
          <SuggestedQuestions onSelect={q => handleSend(q)} />
        ) : (
          messages.map(msg => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              onSpeak={(text) => handleSpeak(text, msg.id)}
              isSpeaking={speakingMsgId === msg.id}
            />
          ))
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
          {/* Botón Manos Libres */}
          <Button
            variant="outline"
            size="icon"
            className={`h-11 w-11 shrink-0 rounded-xl transition-all border-2
              ${isHandsFree 
                ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]' 
                : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}
            onClick={() => {
              setIsHandsFree(!isHandsFree);
              stopAllSpeech();
            }}
            title={isHandsFree ? "Desactivar modo manos libres" : "Activar modo manos libres"}
          >
            <AudioLines className={`w-5 h-5 ${isHandsFree ? 'animate-pulse' : ''}`} />
          </Button>

          <div className="relative flex-1">
            <Textarea
              placeholder="Escribe tu pregunta sobre los datos de la empresa…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={MAX_QUESTION_LENGTH}
              className="resize-none min-h-[44px] max-h-32 flex-1 text-sm pr-12"
              disabled={sendQuestion.isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full transition-all
                ${isListening 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-primary'}`}
              onClick={toggleListening}
              disabled={sendQuestion.isPending}
              type="button"
            >
              <Mic className={`w-4 h-4 ${isListening ? 'scale-110' : ''}`} />
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </Button>
          </div>
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
          Solo respondo preguntas sobre datos internos autorizados - {input.length}/{MAX_QUESTION_LENGTH}
        </p>
      </div>
    </div>
  );
}
