/**
 * Core type definitions for OmniChat Unified Messaging Client
 * Aligned with Matrix-mautrix bridge architecture specifications.
 */

export type ServiceId =
  | 'whatsapp'
  | 'telegram'
  | 'messenger'
  | 'instagram'
  | 'discord'
  | 'matrix';

export type ConnectionState =
  | 'connected'
  | 'connecting'
  | 'needs_auth'
  | 'disconnected'
  | 'error';

export type MessageDeliveryStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface BridgeCapabilities {
  sendText: boolean;
  sendMedia: boolean;
  reactions: boolean;
  edits: boolean;
  replies: boolean;
  readReceipts: boolean;
  voiceNotes: boolean;
  typingIndicators: boolean;
  deleteMessage: boolean;
  groupChats: boolean;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  durationSeconds?: number;
  dimensions?: { width: number; height: number };
}

export interface MessageReaction {
  key: string; // Emoji e.g. "👍", "❤️"
  count: number;
  senders: string[]; // User IDs who reacted
  hasReacted: boolean; // Current user reacted
}

export interface ReplyContext {
  messageId: string;
  senderName: string;
  content: string;
  attachmentType?: 'image' | 'file' | 'audio';
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isSelf: boolean;
  content: string;
  timestamp: number;
  status: MessageDeliveryStatus;
  edited?: boolean;
  replyTo?: ReplyContext;
  reactions: MessageReaction[];
  attachment?: Attachment;
  service: ServiceId;
  rawEventId?: string; // Matrix event ID ($...)
  errorMessage?: string;
}

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  customStatus?: string;
  role?: 'admin' | 'member';
  nativePlatformUsername?: string;
}

export interface ConversationSummary {
  roomId: string; // Matrix room ID (!...:homeserver)
  service: ServiceId;
  title: string;
  avatarUrl?: string;
  isGroup: boolean;
  isMuted: boolean;
  isPinned: boolean;
  participants: Participant[];
  lastMessage?: string;
  lastMessageSender?: string;
  lastActivityAt: number;
  unreadCount: number;
  isEncrypted: boolean; // Native Matrix room encryption
  bridgeTrustNotice?: string;
  connectionState: ConnectionState;
  capabilities: BridgeCapabilities;
  nativeChatId?: string; // e.g. "12036302492@s.whatsapp.net" or Discord channel ID
}

export interface BridgeInfo {
  id: ServiceId;
  name: string;
  packageName: string;
  version: string;
  connectionState: ConnectionState;
  lastSyncAt: number;
  uptimeHours: number;
  eventsProcessed: number;
  accountIdentifier?: string;
  errorDetail?: string;
  capabilities: BridgeCapabilities;
  knownLimitations: string[];
  securityNote: string;
}

export type NetworkCondition = 'online' | 'slow_3g' | 'offline';

export interface AppSettings {
  homeserverUrl: string;
  username: string;
  fcmPushToken: string;
  pushGatewayEnabled: boolean;
  notificationsMuted: boolean;
  previewMessageBody: boolean;
  e2eeKeysBackedUp: boolean;
  networkCondition: NetworkCondition;
  theme: 'light' | 'dark' | 'system';
  showMobileFrame: boolean;
  scrubTelemetryLogs: boolean;
}
