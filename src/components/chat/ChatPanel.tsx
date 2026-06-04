import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Archive,
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Paperclip,
  Pause,
  Pin,
  Search,
  Send,
  Smile,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getChatMessageType,
  useChatActions,
  useChatConversations,
  useChatMessages,
  useChatUsers,
} from '@/hooks/useChat';
import type { ChatAttachment, ChatConversationSummary, ChatMessage, ChatParticipant, ChatUser } from '@/types/chat';
import { cn } from '@/lib/utils';

const EMOJIS = ['👍', '❤️', '😂', '👏', '🙏', '🎉', '✅', '🔥', '💡', '😊', '😄', '😮', '😢', '😎', '👀', '💪'];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

const userName = (user?: Partial<ChatUser> | null) =>
  user?.full_name?.trim() || user?.display_name?.trim() || 'Usuario';

const formatChatTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ayer';
  return format(date, 'dd MMM', { locale: es });
};

const formatMessageDate = (value: string) => {
  const date = new Date(value);
  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  return format(date, "d 'de' MMMM", { locale: es });
};

const fileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  const isImage = attachment.mime_type.startsWith('image/');
  const isVideo = attachment.mime_type.startsWith('video/');
  const isAudio = attachment.mime_type.startsWith('audio/');

  if (isImage && attachment.signedUrl) {
    return (
      <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border bg-background">
        <img src={attachment.signedUrl} alt={attachment.file_name} className="max-h-72 w-full object-cover" />
      </a>
    );
  }

  if (isVideo && attachment.signedUrl) {
    return (
      <video controls className="max-h-72 w-full rounded-lg border border-border bg-black">
        <source src={attachment.signedUrl} type={attachment.mime_type} />
      </video>
    );
  }

  if (isAudio && attachment.signedUrl) {
    return (
      <div className="rounded-lg border border-border bg-background p-2">
        <audio controls className="h-10 w-full">
          <source src={attachment.signedUrl} type={attachment.mime_type} />
        </audio>
      </div>
    );
  }

  return (
    <a
      href={attachment.signedUrl || '#'}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3 hover:border-primary/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{attachment.file_name}</span>
        <span className="text-xs text-muted-foreground">{fileSize(attachment.file_size)}</span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

function ConversationAvatar({ title, avatarUrl }: { title: string; avatarUrl?: string | null }) {
  return (
    <Avatar className="h-11 w-11 shrink-0">
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{initials(title)}</AvatarFallback>
    </Avatar>
  );
}

function ConversationListItem({
  item,
  active,
  onSelect,
}: {
  item: ChatConversationSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 border-b border-border/70 px-3 py-3 text-left transition-colors hover:bg-accent/70',
        active && 'bg-primary/10'
      )}
    >
      <ConversationAvatar title={item.title} avatarUrl={item.avatarUrl} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-foreground">{item.title}</span>
          {item.selfParticipant.pinned_at && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {item.conversation.last_message_preview || 'Sin mensajes recientes'}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[11px] text-muted-foreground">{formatChatTime(item.conversation.last_message_at || item.conversation.created_at)}</span>
        {item.unreadCount > 0 && (
          <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">{item.unreadCount}</Badge>
        )}
      </span>
    </button>
  );
}

function NewChatDialog({
  open,
  onOpenChange,
  users,
  onDirect,
  onGroup,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: ChatUser[];
  onDirect: (userId: string) => Promise<void>;
  onGroup: (title: string, userIds: string[]) => Promise<void>;
  isSaving: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const filteredUsers = users.filter((user) => userName(user).toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIds([]);
      setGroupTitle('');
    }
  }, [open]);

  const toggle = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo chat</DialogTitle>
          <DialogDescription>Inicia una conversación directa o selecciona varias personas para crear un grupo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Buscar usuario" />
          </div>
          {selectedIds.length > 1 && (
            <Input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Nombre del grupo" />
          )}
          <ScrollArea className="h-72 rounded-lg border border-border">
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => {
                const selected = selectedIds.includes(user.id);
                return (
                  <div key={user.id} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox checked={selected} onCheckedChange={() => toggle(user.id)} />
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggle(user.id)}>
                      <ConversationAvatar title={userName(user)} avatarUrl={user.avatar_url} />
                      <span className="truncate text-sm font-semibold">{userName(user)}</span>
                    </button>
                    <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={() => onDirect(user.id)}>
                      Chat
                    </Button>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No hay usuarios disponibles.</p>}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={selectedIds.length < 2 || isSaving}
            onClick={() => onGroup(groupTitle, selectedIds)}
          >
            <Users className="mr-2 h-4 w-4" />
            Crear grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MessageBubble({
  message,
  isOwn,
  onReact,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onReact: (message: ChatMessage, emoji: string) => void;
}) {
  const groupedReactions = useMemo(() => {
    const counts = new Map<string, number>();
    message.reactions?.forEach((reaction) => counts.set(reaction.emoji, (counts.get(reaction.emoji) || 0) + 1));
    return Array.from(counts.entries());
  }, [message.reactions]);

  return (
    <div className={cn('flex gap-2 px-4 py-1.5', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && <ConversationAvatar title={userName(message.sender)} avatarUrl={message.sender?.avatar_url} />}
      <div className={cn('max-w-[82%] sm:max-w-[68%]', isOwn && 'items-end')}>
        {!isOwn && <p className="mb-1 text-xs font-semibold text-muted-foreground">{userName(message.sender)}</p>}
        <div
          className={cn(
            'group relative rounded-2xl px-3 py-2 text-sm shadow-sm',
            isOwn
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-bl-sm border border-border bg-card text-card-foreground'
          )}
        >
          {(message.attachments || []).length > 0 && (
            <div className="mb-2 space-y-2">
              {message.attachments?.map((attachment) => <AttachmentPreview key={attachment.id} attachment={attachment} />)}
            </div>
          )}
          {message.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>}
          <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', isOwn ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
            <span>{format(new Date(message.created_at), 'HH:mm')}</span>
            {isOwn && <Check className="h-3 w-3" />}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'absolute top-1 hidden h-7 w-7 items-center justify-center rounded-full border border-border bg-popover text-popover-foreground shadow-sm group-hover:flex',
                  isOwn ? '-left-9' : '-right-9'
                )}
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2">
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} type="button" className="rounded-md p-1 text-lg hover:bg-accent" onClick={() => onReact(message, emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {groupedReactions.length > 0 && (
          <div className={cn('mt-1 flex flex-wrap gap-1', isOwn ? 'justify-end' : 'justify-start')}>
            {groupedReactions.map(([emoji, count]) => (
              <button key={emoji} type="button" className="rounded-full border border-border bg-card px-2 py-0.5 text-xs shadow-sm" onClick={() => onReact(message, emoji)}>
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({
  disabled,
  onSend,
  isSending,
}: {
  disabled: boolean;
  onSend: (content: string, files: File[]) => Promise<void>;
  isSending: boolean;
}) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (disabled || isSending || (!message.trim() && files.length === 0)) return;
    await onSend(message, files);
    setMessage('');
    setFiles([]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `nota-voz-${Date.now()}.webm`, { type: blob.type });
        setFiles((current) => [...current, file]);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: 'No se pudo acceder al micrófono', description: 'Revisa los permisos del navegador.' });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <form onSubmit={submit} className="border-t border-border bg-card p-3">
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => {
            const type = getChatMessageType(file);
            const Icon = type === 'image' ? ImageIcon : type === 'video' ? Video : type === 'audio' ? Volume2 : FileText;
            return (
              <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{file.name}</span>
                <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" disabled={disabled}>
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((emoji) => (
                <button key={emoji} type="button" className="rounded-md p-1 text-xl hover:bg-accent" onClick={() => setMessage((value) => `${value}${emoji}`)}>
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(event) => setFiles((current) => [...current, ...Array.from(event.target.files || [])])}
        />
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          value={message}
          disabled={disabled}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Escribe un mensaje"
          className="min-h-11 flex-1 rounded-full"
        />
        <Button type="button" variant={isRecording ? 'destructive' : 'ghost'} size="icon" disabled={disabled} onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <Pause className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button type="submit" size="icon" className="rounded-full" disabled={disabled || isSending || (!message.trim() && files.length === 0)}>
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}

export function ChatPanel() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [search, setSearch] = useState('');
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const selectedId = searchParams.get('conversation');
  const { toast } = useToast();
  const conversationsQuery = useChatConversations();
  const usersQuery = useChatUsers();
  const actions = useChatActions();
  const selected = conversationsQuery.data?.find((item) => item.conversation.id === selectedId) || null;
  const messagesQuery = useChatMessages(selectedId);

  const filteredConversations = (conversationsQuery.data || []).filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedId && filteredConversations[0]) {
      setSearchParams({ conversation: filteredConversations[0].conversation.id }, { replace: true });
    }
  }, [filteredConversations, selectedId, setSearchParams]);

  useEffect(() => {
    if (!selectedId) return;
    actions.markAsRead(selectedId).catch(() => undefined);
  }, [messagesQuery.data?.length, selectedId]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messagesQuery.data?.length, selectedId]);

  const openConversation = (conversationId: string) => setSearchParams({ conversation: conversationId });

  const handleDirect = async (userId: string) => {
    try {
      const conversationId = await actions.createDirectConversation(userId);
      setNewChatOpen(false);
      openConversation(conversationId);
    } catch (error) {
      toast({ title: 'No se pudo crear el chat', description: error instanceof Error ? error.message : 'Intenta nuevamente.' });
    }
  };

  const handleGroup = async (title: string, userIds: string[]) => {
    try {
      const conversationId = await actions.createGroupConversation({ title, participantIds: userIds });
      setNewChatOpen(false);
      openConversation(conversationId);
    } catch (error) {
      toast({ title: 'No se pudo crear el grupo', description: error instanceof Error ? error.message : 'Intenta nuevamente.' });
    }
  };

  const handleSend = async (content: string, files: File[]) => {
    if (!selected) return;
    try {
      await actions.sendMessage({
        conversationId: selected.conversation.id,
        companyId: selected.conversation.company_id,
        content,
        files,
      });
    } catch (error) {
      toast({ title: 'No se pudo enviar el mensaje', description: error instanceof Error ? error.message : 'Intenta nuevamente.' });
    }
  };

  const updateSelfSettings = async (
    changes: Partial<Pick<ChatParticipant, 'muted_until' | 'archived_at' | 'pinned_at'>>
  ) => {
    if (!selected?.selfParticipant.id) return;
    await actions.updateParticipantSettings({ participantId: selected.selfParticipant.id, changes });
  };

  let previousDate = '';

  return (
    <div className="h-[calc(100dvh-7.5rem)] overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={cn('flex h-full min-h-0 flex-col border-r border-border bg-card', selected && 'hidden md:flex')}>
          <div className="border-b border-border p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black tracking-tight">Chat</h1>
                <p className="text-xs text-muted-foreground">Los mensajes expiran en 48 horas.</p>
              </div>
              <Button size="sm" onClick={() => setNewChatOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Nuevo
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Buscar chats" />
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {filteredConversations.map((item) => (
              <ConversationListItem
                key={item.conversation.id}
                item={item}
                active={item.conversation.id === selectedId}
                onSelect={() => openConversation(item.conversation.id)}
              />
            ))}
            {!conversationsQuery.isLoading && filteredConversations.length === 0 && (
              <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                <Users className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-semibold">No tienes chats activos</p>
                <p className="mt-1 text-xs text-muted-foreground">Crea uno desde el botón Nuevo.</p>
              </div>
            )}
          </ScrollArea>
        </aside>

        <section className={cn('flex h-full min-h-0 flex-col bg-background', !selected && 'hidden md:flex')}>
          {selected ? (
            <>
              <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchParams({})}>
                  <X className="h-5 w-5" />
                </Button>
                <ConversationAvatar title={selected.title} avatarUrl={selected.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{selected.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selected.participants.length} participante{selected.participants.length === 1 ? '' : 's'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateSelfSettings({ pinned_at: selected.selfParticipant.pinned_at ? null : new Date().toISOString() })}>
                      <Pin className="mr-2 h-4 w-4" />
                      {selected.selfParticipant.pinned_at ? 'Desfijar' : 'Fijar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateSelfSettings({ muted_until: selected.selfParticipant.muted_until ? null : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() })}>
                      <Volume2 className="mr-2 h-4 w-4" />
                      {selected.selfParticipant.muted_until ? 'Activar sonido' : 'Silenciar 8 horas'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateSelfSettings({ archived_at: new Date().toISOString() })}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </header>
              <ScrollArea className="min-h-0 flex-1">
                <div className="py-4">
                  {(messagesQuery.data || []).map((message) => {
                    const currentDate = formatMessageDate(message.created_at);
                    const showDate = currentDate !== previousDate;
                    previousDate = currentDate;
                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                              {currentDate}
                            </span>
                          </div>
                        )}
                        <MessageBubble
                          message={message}
                          isOwn={message.sender_id === user?.id}
                          onReact={(item, emoji) => actions.toggleReaction({ message: item, emoji })}
                        />
                      </div>
                    );
                  })}
                  {messagesQuery.data?.length === 0 && (
                    <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                      <Smile className="mb-3 h-10 w-10" />
                      <p className="text-sm font-semibold">Empieza la conversación</p>
                    </div>
                  )}
                  <div ref={scrollAnchorRef} />
                </div>
              </ScrollArea>
              <Composer disabled={!selected} onSend={handleSend} isSending={actions.isSending} />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <Users className="mb-3 h-12 w-12" />
              <p className="text-sm font-semibold">Selecciona un chat</p>
            </div>
          )}
        </section>
      </div>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        users={usersQuery.data || []}
        onDirect={handleDirect}
        onGroup={handleGroup}
        isSaving={actions.isCreatingConversation}
      />
    </div>
  );
}
