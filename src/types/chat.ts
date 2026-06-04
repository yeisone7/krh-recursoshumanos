export type ChatConversationType = 'direct' | 'group';
export type ChatMessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
export type ChatReceiptStatus = 'sent' | 'delivered' | 'read';

export interface ChatUser {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  company_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  last_read_at: string | null;
  muted_until: string | null;
  archived_at: string | null;
  pinned_at: string | null;
  joined_at: string;
  created_at: string;
  user?: ChatUser;
}

export interface ChatConversation {
  id: string;
  company_id: string;
  type: ChatConversationType;
  title: string | null;
  avatar_url: string | null;
  created_by: string;
  last_message_id: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatConversationSummary {
  conversation: ChatConversation;
  selfParticipant: ChatParticipant;
  participants: ChatParticipant[];
  title: string;
  avatarUrl: string | null;
  unreadCount: number;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  conversation_id: string;
  company_id: string;
  uploaded_by: string;
  bucket_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  expires_at: string;
  signedUrl?: string | null;
}

export interface ChatReaction {
  id: string;
  message_id: string;
  conversation_id: string;
  company_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  company_id: string;
  sender_id: string;
  content: string | null;
  message_type: ChatMessageType;
  reply_to_message_id: string | null;
  metadata: Record<string, unknown>;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  expires_at: string;
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  sender?: ChatUser;
}
