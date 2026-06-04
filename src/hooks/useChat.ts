import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ChatAttachment,
  ChatConversation,
  ChatConversationSummary,
  ChatMessage,
  ChatMessageType,
  ChatParticipant,
  ChatReaction,
  ChatUser,
} from '@/types/chat';

const chatClient = supabase as any;
const CHAT_BUCKET = 'chat-media';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const cleanName = (user?: Partial<ChatUser> | null) =>
  user?.full_name?.trim() || user?.display_name?.trim() || 'Usuario';

const safeFileName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'archivo';

export const getChatMessageType = (file?: File | Blob | null): ChatMessageType => {
  if (!file) return 'text';
  const type = file.type || '';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'file';
};

const mergeSignedUrls = async (messages: ChatMessage[]) => {
  const attachments = messages.flatMap((message) => message.attachments || []);
  if (attachments.length === 0) return messages;

  const signedUrlMap = new Map<string, string | null>();
  await Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from(attachment.bucket_id || CHAT_BUCKET)
        .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL_SECONDS);
      signedUrlMap.set(attachment.id, data?.signedUrl || null);
    })
  );

  return messages.map((message) => ({
    ...message,
    attachments: (message.attachments || []).map((attachment) => ({
      ...attachment,
      signedUrl: signedUrlMap.get(attachment.id) || null,
    })),
  }));
};

export function useChatUsers() {
  const { user, currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['chat', 'users', currentCompanyId, user?.id],
    enabled: !!user && !!currentCompanyId,
    queryFn: async () => {
      const { data: assignments, error: assignmentsError } = await chatClient
        .from('user_company_assignments')
        .select('user_id')
        .eq('company_id', currentCompanyId);

      if (assignmentsError) throw assignmentsError;

      const userIds = Array.from(new Set((assignments || []).map((row: any) => row.user_id))).filter(
        (id) => id && id !== user?.id
      );

      if (userIds.length === 0) return [] as ChatUser[];

      const { data: profiles, error: profilesError } = await chatClient
        .from('user_profiles')
        .select('id, full_name, display_name, avatar_url')
        .in('id', userIds)
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;
      return (profiles || []) as ChatUser[];
    },
  });
}

export function useChatConversations() {
  const { user, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chat', 'conversations', currentCompanyId, user?.id],
    enabled: !!user && !!currentCompanyId,
    queryFn: async () => {
      const { data: ownParticipants, error: participantError } = await chatClient
        .from('chat_participants')
        .select('*, chat_conversations(*)')
        .eq('user_id', user!.id)
        .eq('company_id', currentCompanyId)
        .eq('is_active', true)
        .is('archived_at', null)
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (participantError) throw participantError;

      const conversationIds = (ownParticipants || [])
        .map((row: any) => row.conversation_id)
        .filter(Boolean);

      if (conversationIds.length === 0) return [] as ChatConversationSummary[];

      const { data: allParticipants, error: allParticipantsError } = await chatClient
        .from('chat_participants')
        .select('*')
        .in('conversation_id', conversationIds)
        .eq('is_active', true);

      if (allParticipantsError) throw allParticipantsError;

      const userIds = Array.from(new Set((allParticipants || []).map((row: any) => row.user_id)));
      const { data: profiles, error: profilesError } = await chatClient
        .from('user_profiles')
        .select('id, full_name, display_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map<string, ChatUser>((profiles || []).map((profile: ChatUser) => [profile.id, profile]));
      const participantsByConversation = new Map<string, ChatParticipant[]>();

      (allParticipants || []).forEach((participant: ChatParticipant) => {
        const enriched = { ...participant, user: profileMap.get(participant.user_id) };
        const current = participantsByConversation.get(participant.conversation_id) || [];
        current.push(enriched);
        participantsByConversation.set(participant.conversation_id, current);
      });

      const summaries = (ownParticipants || [])
        .map((row: any) => {
          const conversation = row.chat_conversations as ChatConversation | null;
          if (!conversation) return null;

          const participants = participantsByConversation.get(conversation.id) || [];
          const otherParticipants = participants.filter((participant) => participant.user_id !== user!.id);
          const title =
            conversation.title?.trim() ||
            otherParticipants.map((participant) => cleanName(participant.user)).join(', ') ||
            'Chat';
          const avatarUrl = conversation.avatar_url || otherParticipants[0]?.user?.avatar_url || null;
          const lastReadAt = row.last_read_at ? new Date(row.last_read_at).getTime() : new Date(row.joined_at).getTime();
          const unreadCount = 0;

          return {
            conversation,
            selfParticipant: row as ChatParticipant,
            participants,
            title,
            avatarUrl,
            unreadCount,
            _lastReadAt: lastReadAt,
          };
        })
        .filter(Boolean) as (ChatConversationSummary & { _lastReadAt: number })[];

      const messageCounts = await Promise.all(
        summaries.map(async (summary) => {
          const since = new Date(summary._lastReadAt).toISOString();
          const { count } = await chatClient
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', summary.conversation.id)
            .neq('sender_id', user!.id)
            .gt('created_at', since);
          return [summary.conversation.id, count || 0] as const;
        })
      );

      const unreadMap = new Map(messageCounts);
      return summaries
        .map(({ _lastReadAt, ...summary }) => ({
          ...summary,
          unreadCount: unreadMap.get(summary.conversation.id) || 0,
        }))
        .sort((a, b) => {
          const aPinned = a.selfParticipant.pinned_at ? 1 : 0;
          const bPinned = b.selfParticipant.pinned_at ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          return (
            new Date(b.conversation.last_message_at || b.conversation.created_at).getTime() -
            new Date(a.conversation.last_message_at || a.conversation.created_at).getTime()
          );
        });
    },
  });

  useEffect(() => {
    if (!user || !currentCompanyId) return;

    const channel = supabase
      .channel(`chat-conversations-${currentCompanyId}-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `company_id=eq.${currentCompanyId}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompanyId, queryClient, user]);

  return query;
}

export function useChatUnreadCount(enabled = true) {
  const { user, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chat', 'unread-count', currentCompanyId, user?.id],
    enabled: enabled && !!user && !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await chatClient.rpc('get_chat_unread_count', { _company_id: currentCompanyId });
      if (error) throw error;
      return Number(data || 0);
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!enabled) return;
    if (!user || !currentCompanyId) return;

    const channel = supabase
      .channel(`chat-unread-${currentCompanyId}-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `company_id=eq.${currentCompanyId}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompanyId, enabled, queryClient, user]);

  return query;
}

export function useChatMessages(conversationId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    enabled: !!user && !!conversationId,
    queryFn: async () => {
      const { data: messages, error } = await chatClient
        .from('chat_messages')
        .select('*, chat_attachments(*), chat_reactions(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const normalized = (messages || []).map((message: any) => ({
        ...message,
        attachments: (message.chat_attachments || []) as ChatAttachment[],
        reactions: (message.chat_reactions || []) as ChatReaction[],
      })) as ChatMessage[];

      const userIds = Array.from(new Set(normalized.map((message) => message.sender_id)));
      const { data: profiles } = userIds.length
        ? await chatClient.from('user_profiles').select('id, full_name, display_name, avatar_url').in('id', userIds)
        : { data: [] };

      const profileMap = new Map<string, ChatUser>((profiles || []).map((profile: ChatUser) => [profile.id, profile]));
      const withUsers = normalized.map((message) => ({ ...message, sender: profileMap.get(message.sender_id) }));

      return mergeSignedUrls(withUsers);
    },
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_attachments', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reactions', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useChatActions() {
  const { user, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  const createDirectConversation = useMutation({
    mutationFn: async (peerUserId: string) => {
      if (!user?.id || !currentCompanyId) throw new Error('No hay usuario o empresa activa.');

      const { data: ownDirects, error: ownDirectsError } = await chatClient
        .from('chat_participants')
        .select('conversation_id, chat_conversations!inner(type)')
        .eq('user_id', user.id)
        .eq('company_id', currentCompanyId)
        .eq('chat_conversations.type', 'direct');

      if (ownDirectsError) throw ownDirectsError;

      const directIds = (ownDirects || []).map((row: any) => row.conversation_id);
      if (directIds.length > 0) {
        const { data: peerParticipants } = await chatClient
          .from('chat_participants')
          .select('conversation_id')
          .in('conversation_id', directIds)
          .eq('user_id', peerUserId)
          .eq('is_active', true)
          .limit(1);

        if (peerParticipants?.[0]?.conversation_id) return peerParticipants[0].conversation_id as string;
      }

      const conversationId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error: conversationError } = await chatClient.from('chat_conversations').insert({
        id: conversationId,
        company_id: currentCompanyId,
        type: 'direct',
        created_by: user.id,
        created_at: now,
        updated_at: now,
      });

      if (conversationError) throw conversationError;

      const { error: participantsError } = await chatClient.from('chat_participants').insert([
        { conversation_id: conversationId, company_id: currentCompanyId, user_id: user.id, role: 'member' },
        { conversation_id: conversationId, company_id: currentCompanyId, user_id: peerUserId, role: 'member' },
      ]);

      if (participantsError) throw participantsError;

      return conversationId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  });

  const createGroupConversation = useMutation({
    mutationFn: async ({ title, participantIds }: { title: string; participantIds: string[] }) => {
      if (!user?.id || !currentCompanyId) throw new Error('No hay usuario o empresa activa.');
      const conversationId = crypto.randomUUID();
      const uniqueParticipantIds = Array.from(new Set([user.id, ...participantIds]));

      const { error: conversationError } = await chatClient.from('chat_conversations').insert({
        id: conversationId,
        company_id: currentCompanyId,
        type: 'group',
        title: title.trim() || 'Grupo',
        created_by: user.id,
      });

      if (conversationError) throw conversationError;

      const { error: participantsError } = await chatClient.from('chat_participants').insert(
        uniqueParticipantIds.map((id) => ({
          conversation_id: conversationId,
          company_id: currentCompanyId,
          user_id: id,
          role: id === user.id ? 'admin' : 'member',
        }))
      );

      if (participantsError) throw participantsError;
      return conversationId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      conversationId,
      companyId,
      content,
      files = [],
    }: {
      conversationId: string;
      companyId: string;
      content?: string;
      files?: File[];
    }) => {
      if (!user?.id) throw new Error('No hay usuario autenticado.');
      const trimmed = content?.trim() || '';
      if (!trimmed && files.length === 0) return null;

      const messageId = crypto.randomUUID();
      const firstFile = files[0];
      const messageType = firstFile ? getChatMessageType(firstFile) : 'text';
      const fallbackContent = firstFile ? firstFile.name : trimmed;

      const { error: messageError } = await chatClient.from('chat_messages').insert({
        id: messageId,
        conversation_id: conversationId,
        company_id: companyId,
        sender_id: user.id,
        content: trimmed || fallbackContent,
        message_type: messageType,
        metadata: files.length > 0 ? { attachment_count: files.length } : {},
      });

      if (messageError) throw messageError;

      if (files.length > 0) {
        const attachmentRows = [];

        for (const file of files) {
          const path = `${companyId}/${conversationId}/${messageId}/${Date.now()}-${safeFileName(file.name)}`;
          const { error: uploadError } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined,
          });

          if (uploadError) throw uploadError;

          attachmentRows.push({
            message_id: messageId,
            conversation_id: conversationId,
            company_id: companyId,
            uploaded_by: user.id,
            bucket_id: CHAT_BUCKET,
            storage_path: path,
            file_name: file.name,
            mime_type: file.type || 'application/octet-stream',
            file_size: file.size,
          });
        }

        const { error: attachmentError } = await chatClient.from('chat_attachments').insert(attachmentRows);
        if (attachmentError) throw attachmentError;
      }

      supabase.functions.invoke('send-chat-push', { body: { messageId } }).catch(() => undefined);

      return messageId;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) return;
      const { error } = await chatClient
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  });

  const toggleReaction = useMutation({
    mutationFn: async ({ message, emoji }: { message: ChatMessage; emoji: string }) => {
      if (!user?.id) return;
      const existing = message.reactions?.find((reaction) => reaction.user_id === user.id && reaction.emoji === emoji);
      if (existing) {
        const { error } = await chatClient.from('chat_reactions').delete().eq('id', existing.id);
        if (error) throw error;
        return;
      }

      const { error } = await chatClient.from('chat_reactions').insert({
        message_id: message.id,
        conversation_id: message.conversation_id,
        company_id: message.company_id,
        user_id: user.id,
        emoji,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['chat', 'messages', vars.message.conversation_id] }),
  });

  const updateParticipantSettings = useMutation({
    mutationFn: async ({
      participantId,
      changes,
    }: {
      participantId: string;
      changes: Partial<Pick<ChatParticipant, 'muted_until' | 'archived_at' | 'pinned_at'>>;
    }) => {
      const { error } = await chatClient.from('chat_participants').update(changes).eq('id', participantId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  });

  return {
    createDirectConversation: createDirectConversation.mutateAsync,
    createGroupConversation: createGroupConversation.mutateAsync,
    sendMessage: sendMessage.mutateAsync,
    markAsRead: markAsRead.mutateAsync,
    toggleReaction: toggleReaction.mutateAsync,
    updateParticipantSettings: updateParticipantSettings.mutateAsync,
    isSending: sendMessage.isPending,
    isCreatingConversation: createDirectConversation.isPending || createGroupConversation.isPending,
  };
}

export function useSelectedChat(conversationId?: string | null) {
  const conversationsQuery = useChatConversations();
  return useMemo(
    () => conversationsQuery.data?.find((item) => item.conversation.id === conversationId) || null,
    [conversationId, conversationsQuery.data]
  );
}
