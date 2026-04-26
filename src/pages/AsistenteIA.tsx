import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Bot, Clock, MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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

function MessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-lg px-4 py-3 text-sm shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-card-foreground'
        )}
      >
        {isUser ? (
          <p className=
