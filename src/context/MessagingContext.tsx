import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ServiceId,
  ConversationSummary,
  Message,
  BridgeInfo,
  AppSettings,
  ReplyContext,
  Attachment,
  ConnectionState,
} from '../types';
import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../config/seedData';
import { INITIAL_BRIDGES, SERVICES_CONFIG } from '../config/services';
import { playMessageSound, showPushNotification, triggerHaptic } from '../services/notificationService';

export interface InAppToast {
  id: string;
  title: string;
  body: string;
  service: ServiceId;
  roomId: string;
}

interface MessagingContextType {
  conversations: ConversationSummary[];
  messages: Record<string, Message[]>;
  activeRoomId: string | null;
  activeRoom: ConversationSummary | null;
  activeMessages: Message[];
  serviceFilter: ServiceId | 'all';
  unreadOnly: boolean;
  searchQuery: string;
  activeTab: 'inbox' | 'search' | 'bridges' | 'matrix' | 'settings';
  bridges: BridgeInfo[];
  settings: AppSettings;
  inAppToast: InAppToast | null;
  isTyping: boolean;

  // Actions
  setActiveRoomId: (roomId: string | null) => void;
  setServiceFilter: (filter: ServiceId | 'all') => void;
  setUnreadOnly: (unreadOnly: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: 'inbox' | 'search' | 'bridges' | 'matrix' | 'settings') => void;
  sendMessage: (payload: { content: string; replyTo?: ReplyContext; attachment?: Attachment }) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => void;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  markAsRead: (roomId: string) => void;
  togglePinConversation: (roomId: string) => void;
  toggleMuteConversation: (roomId: string) => void;
  updateBridgeStatus: (serviceId: ServiceId, state: ConnectionState, detail?: string) => void;
  reconnectBridge: (serviceId: ServiceId) => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => void;
  simulateIncomingMessage: (serviceId?: ServiceId) => void;
  clearInAppToast: () => void;
  syncWhatsAppChats: () => Promise<void>;
  isSyncingWhatsApp: boolean;
  restoreWhatsAppSession: (backupData?: any) => Promise<boolean>;
  backupWhatsAppSession: () => Promise<any>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnichat_conversations');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* use initial */ }
      }
    }
    return INITIAL_CONVERSATIONS;
  });

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnichat_messages');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* use initial */ }
      }
    }
    return INITIAL_MESSAGES;
  });

  const [bridges, setBridges] = useState<BridgeInfo[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnichat_bridges');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* use initial */ }
      }
    }
    return INITIAL_BRIDGES;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      homeserverUrl: 'https://synapse.local.mesh',
      username: '@alex:matrix.local',
      fcmPushToken: 'fcm_e819ac4092b7194_dev_key',
      pushGatewayEnabled: true,
      notificationsMuted: false,
      previewMessageBody: true,
      e2eeKeysBackedUp: true,
      networkCondition: 'online',
      theme: 'dark',
      showMobileFrame: false,
      scrubTelemetryLogs: true,
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnichat_settings');
      if (saved) {
        try { return { ...defaultSettings, ...JSON.parse(saved) }; } catch { /* use default */ }
      }
    }
    return defaultSettings;
  });

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<ServiceId | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'search' | 'bridges' | 'matrix' | 'settings'>('inbox');
  const [inAppToast, setInAppToast] = useState<InAppToast | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('omnichat_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('omnichat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('omnichat_bridges', JSON.stringify(bridges));
  }, [bridges]);

  useEffect(() => {
    localStorage.setItem('omnichat_settings', JSON.stringify(settings));
  }, [settings]);

  const [isSyncingWhatsApp, setIsSyncingWhatsApp] = useState(false);

  // Sync real WhatsApp conversations from backend Baileys store
  const syncWhatsAppChats = useCallback(async () => {
    try {
      setIsSyncingWhatsApp(true);
      const res = await fetch('/api/whatsapp/chats');
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && Array.isArray(data.chats) && data.chats.length > 0) {
        const liveConvs: ConversationSummary[] = data.chats.map((c: any) => ({
          roomId: c.jid,
          service: 'whatsapp' as const,
          title: c.name || (c.isGroup ? 'WhatsApp Group' : `+${c.jid.split('@')[0]}`),
          avatarUrl:
            c.avatarUrl ||
            (c.isGroup
              ? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=160&q=80'
              : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80'),
          isGroup: Boolean(c.isGroup),
          isMuted: false,
          isPinned: false,
          unreadCount: c.unreadCount || 0,
          isEncrypted: false,
          bridgeTrustNotice: 'Bridged via WhatsApp Multi-Device session (Baileys).',
          connectionState: 'connected' as const,
          capabilities: SERVICES_CONFIG.whatsapp.defaultCapabilities,
          lastActivityAt: c.lastActivityAt || Date.now(),
          lastMessageSender: c.lastMessageSender || '',
          lastMessage: c.lastMessage || 'Synced chat',
          nativeChatId: c.jid,
          participants:
            Array.isArray(c.participants) && c.participants.length > 0
              ? c.participants
              : [
                  {
                    id: c.jid,
                    name: c.name || c.jid,
                    isOnline: true,
                    nativePlatformUsername: c.jid.split('@')[0],
                  },
                ],
        }));

        setConversations((prev) => {
          // Filter out dummy placeholder WhatsApp rooms (!wa-family-vacation and !wa-sarah-chen)
          const nonPlaceholders = prev.filter(
            (conv) => conv.service !== 'whatsapp' || !conv.roomId.includes(':homeserver.local')
          );
          // Combine existing non-placeholders with live chats (avoiding duplicates)
          const merged = [...liveConvs];
          for (const item of nonPlaceholders) {
            if (!merged.some((m) => m.roomId === item.roomId)) {
              merged.push(item);
            }
          }
          return merged;
        });
      }
    } catch (err) {
      console.warn('Error fetching live WhatsApp chats:', err);
    } finally {
      setIsSyncingWhatsApp(false);
    }
  }, []);

  // Sync WhatsApp live backend status and events
  useEffect(() => {
    // 1. Initial status fetch
    fetch('/api/whatsapp/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.connectionState) {
          const mappedState = data.connectionState === 'qr_ready' ? 'needs_auth' : data.connectionState;
          setBridges((prev) =>
            prev.map((b) =>
              b.id === 'whatsapp'
                ? {
                    ...b,
                    connectionState: mappedState,
                    accountIdentifier: data.phone || b.accountIdentifier,
                    lastSyncAt: Date.now(),
                  }
                : b
            )
          );

          if (data.connectionState === 'connected') {
            syncWhatsAppChats();
            backupWhatsAppSession();
          }
        }
      })
      .catch(() => {
        // Fallback gracefully if backend not ready
      });

    // 2. Subscribe to live SSE events from backend bridge
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/whatsapp/events');

      eventSource.addEventListener('status_change', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.connectionState) {
            const mappedState = data.connectionState === 'qr_ready' ? 'needs_auth' : data.connectionState;
            setBridges((prev) =>
              prev.map((b) =>
                b.id === 'whatsapp'
                  ? {
                      ...b,
                      connectionState: mappedState,
                      accountIdentifier: data.phone || b.accountIdentifier,
                      lastSyncAt: Date.now(),
                    }
                  : b
              )
            );

            if (data.connectionState === 'connected') {
              syncWhatsAppChats();
              backupWhatsAppSession();
            }
          }
        } catch (e) {
          console.warn('Error parsing SSE status_change:', e);
        }
      });

      eventSource.addEventListener('chats_updated', () => {
        syncWhatsAppChats();
      });

      eventSource.addEventListener('message_received', (event: MessageEvent) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw && raw.roomId) {
            const msg: Message = {
              ...raw,
              reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
            };
            setMessages((prev) => ({
              ...prev,
              [msg.roomId]: [...(prev[msg.roomId] || []), msg],
            }));

            setConversations((prev) =>
              prev.map((c) =>
                c.roomId === msg.roomId
                  ? {
                      ...c,
                      lastMessage: msg.content,
                      lastMessageSender: msg.senderName,
                      lastActivityAt: msg.timestamp,
                      unreadCount: c.roomId === activeRoomId ? 0 : c.unreadCount + 1,
                    }
                  : c
              )
            );

            playMessageSound('incoming');
            triggerHaptic('light');

            if (msg.roomId !== activeRoomId) {
              setInAppToast({
                id: msg.id,
                title: `${msg.senderName} (WhatsApp)`,
                body: msg.content,
                service: 'whatsapp',
                roomId: msg.roomId,
              });
              showPushNotification({
                title: msg.senderName,
                body: msg.content,
                service: 'whatsapp',
                roomId: msg.roomId,
              });
            }
          }
        } catch (e) {
          console.warn('Error parsing message_received SSE:', e);
        }
      });
    } catch {
      // Ignore SSE init failure
    }

    return () => {
      eventSource?.close();
    };
  }, [syncWhatsAppChats, activeRoomId]);

  // Fetch real messages when opening a WhatsApp room
  useEffect(() => {
    if (activeRoomId && (activeRoomId.includes('@s.whatsapp.net') || activeRoomId.includes('@g.us') || activeRoomId.includes('@lid'))) {
      fetch(`/api/whatsapp/messages/${encodeURIComponent(activeRoomId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.messages)) {
            const sanitized: Message[] = data.messages.map((m: any) => ({
              ...m,
              reactions: Array.isArray(m.reactions) ? m.reactions : [],
            }));
            setMessages((prev) => ({
              ...prev,
              [activeRoomId]: sanitized,
            }));
          }
        })
        .catch(() => {});
    }
  }, [activeRoomId]);

  const activeRoom = useMemo(() => {
    if (!activeRoomId) return null;
    return conversations.find((c) => c.roomId === activeRoomId) || null;
  }, [conversations, activeRoomId]);

  const activeMessages = useMemo(() => {
    if (!activeRoomId) return [];
    return messages[activeRoomId] || [];
  }, [messages, activeRoomId]);

  const clearInAppToast = useCallback(() => {
    setInAppToast(null);
  }, []);

  // Mark room as read when opened
  const markAsRead = useCallback((roomId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.roomId === roomId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  useEffect(() => {
    if (activeRoomId) {
      markAsRead(activeRoomId);
    }
  }, [activeRoomId, markAsRead]);

  // Send message
  const sendMessage = useCallback(
    async ({
      content,
      replyTo,
      attachment,
    }: {
      content: string;
      replyTo?: ReplyContext;
      attachment?: Attachment;
    }) => {
      if (!activeRoomId || !activeRoom) return;

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const isOffline = settings.networkCondition === 'offline';
      const initialStatus = isOffline ? 'queued' : 'sending';

      const newMessage: Message = {
        id: messageId,
        roomId: activeRoomId,
        senderId: 'self',
        senderName: 'Alex (You)',
        isSelf: true,
        content: content.trim(),
        timestamp: Date.now(),
        status: initialStatus,
        service: activeRoom.service,
        replyTo,
        attachment,
        reactions: [],
        rawEventId: `$${Math.random().toString(36).substring(2, 12)}:homeserver.local`,
      };

      // Optimistically append to timeline
      setMessages((prev) => ({
        ...prev,
        [activeRoomId]: [...(prev[activeRoomId] || []), newMessage],
      }));

      // Update conversation last activity
      setConversations((prev) =>
        prev.map((c) =>
          c.roomId === activeRoomId
            ? {
                ...c,
                lastMessage: content || (attachment ? `[${attachment.type}]` : ''),
                lastMessageSender: 'You',
                lastActivityAt: Date.now(),
              }
            : c
        )
      );

      playMessageSound('sent');
      triggerHaptic('light');

      if (isOffline) {
        return; // Queued in outbox
      }

      // If active conversation is WhatsApp, notify live backend bridge
      if (activeRoom.service === 'whatsapp') {
        fetch('/api/whatsapp/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: activeRoomId,
            content,
            attachment,
          }),
        }).catch((err) => console.warn('Could not post to WhatsApp backend:', err));
      }

      // Network latency simulation
      const delay = settings.networkCondition === 'slow_3g' ? 1800 : 350;

      setTimeout(() => {
        // Transition to 'sent'
        setMessages((prev) => ({
          ...prev,
          [activeRoomId]: (prev[activeRoomId] || []).map((m) =>
            m.id === messageId ? { ...m, status: 'sent' } : m
          ),
        }));

        // Transition to 'delivered' after brief tick
        setTimeout(() => {
          setMessages((prev) => ({
            ...prev,
            [activeRoomId]: (prev[activeRoomId] || []).map((m) =>
              m.id === messageId ? { ...m, status: 'delivered' } : m
            ),
          }));

          // Simulate read receipt if supported by bridge
          if (activeRoom.capabilities.readReceipts) {
            setTimeout(() => {
              setMessages((prev) => ({
                ...prev,
                [activeRoomId]: (prev[activeRoomId] || []).map((m) =>
                  m.id === messageId ? { ...m, status: 'read' } : m
                ),
              }));
            }, 1200);
          }
        }, 600);

        // Simulate interactive partner reply if room is active
        if (activeRoom.connectionState === 'connected' && activeRoom.participants.length > 0) {
          setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
              setIsTyping(false);
              const partner = activeRoom.participants[0];
              const autoReplies = [
                'Got your message! Testing unified bridge sync.',
                'Acknowledged via Matrix push gateway.',
                'Looks good on mobile WebView! Synced across federated homeserver.',
                'Confirmed. The bridge latency is under 200ms right now.',
                'Thanks for the update!',
              ];
              const replyText = autoReplies[Math.floor(Math.random() * autoReplies.length)];
              const inboundId = `inbound-${Date.now()}`;

              const inboundMsg: Message = {
                id: inboundId,
                roomId: activeRoomId,
                senderId: partner.id,
                senderName: partner.name,
                senderAvatar: partner.avatar,
                isSelf: false,
                content: replyText,
                timestamp: Date.now(),
                status: 'read',
                service: activeRoom.service,
                reactions: [],
                rawEventId: `$${Math.random().toString(36).substring(2, 12)}:homeserver.local`,
              };

              setMessages((prev) => ({
                ...prev,
                [activeRoomId]: [...(prev[activeRoomId] || []), inboundMsg],
              }));

              setConversations((prev) =>
                prev.map((c) =>
                  c.roomId === activeRoomId
                    ? {
                        ...c,
                        lastMessage: replyText,
                        lastMessageSender: partner.name,
                        lastActivityAt: Date.now(),
                      }
                    : c
                )
              );

              playMessageSound('incoming');
              triggerHaptic('light');
            }, 1800);
          }, 1500);
        }
      }, delay);
    },
    [activeRoomId, activeRoom, settings.networkCondition]
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!activeRoomId) return;
      setMessages((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).map((m) =>
          m.id === messageId ? { ...m, status: 'sending', errorMessage: undefined } : m
        ),
      }));

      setTimeout(() => {
        setMessages((prev) => ({
          ...prev,
          [activeRoomId]: (prev[activeRoomId] || []).map((m) =>
            m.id === messageId ? { ...m, status: 'sent' } : m
          ),
        }));
      }, 500);
    },
    [activeRoomId]
  );

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!activeRoomId) return;

      setMessages((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).map((m) => {
          if (m.id !== messageId) return m;

          const currentReactions = Array.isArray(m.reactions) ? m.reactions : [];
          const existingIndex = currentReactions.findIndex((r) => r.key === emoji);
          let newReactions = [...currentReactions];

          if (existingIndex >= 0) {
            const existing = newReactions[existingIndex];
            if (existing.hasReacted) {
              // Remove reaction
              if (existing.count === 1) {
                newReactions.splice(existingIndex, 1);
              } else {
                newReactions[existingIndex] = {
                  ...existing,
                  count: existing.count - 1,
                  hasReacted: false,
                  senders: existing.senders.filter((s) => s !== 'self'),
                };
              }
            } else {
              // Add reaction
              newReactions[existingIndex] = {
                ...existing,
                count: existing.count + 1,
                hasReacted: true,
                senders: [...existing.senders, 'self'],
              };
            }
          } else {
            // New emoji reaction
            newReactions.push({
              key: emoji,
              count: 1,
              hasReacted: true,
              senders: ['self'],
            });
          }

          return { ...m, reactions: newReactions };
        }),
      }));
      triggerHaptic('light');
    },
    [activeRoomId]
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!activeRoomId) return;
      setMessages((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).filter((m) => m.id !== messageId),
      }));
    },
    [activeRoomId]
  );

  const editMessage = useCallback(
    (messageId: string, newContent: string) => {
      if (!activeRoomId) return;
      setMessages((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).map((m) =>
          m.id === messageId ? { ...m, content: newContent, edited: true } : m
        ),
      }));
    },
    [activeRoomId]
  );

  const togglePinConversation = useCallback((roomId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.roomId === roomId ? { ...c, isPinned: !c.isPinned } : c))
    );
  }, []);

  const toggleMuteConversation = useCallback((roomId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.roomId === roomId ? { ...c, isMuted: !c.isMuted } : c))
    );
  }, []);

  const updateBridgeStatus = useCallback(
    (serviceId: ServiceId, state: ConnectionState, detail?: string) => {
      setBridges((prev) =>
        prev.map((b) =>
          b.id === serviceId
            ? {
                ...b,
                connectionState: state,
                errorDetail: detail,
                lastSyncAt: Date.now(),
              }
            : b
        )
      );

      setConversations((prev) =>
        prev.map((c) => (c.service === serviceId ? { ...c, connectionState: state } : c))
      );
    },
    []
  );

  // Backup active session snapshot to browser localStorage
  const backupWhatsAppSession = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/session/backup');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.backup && data.backup.keysCount > 0) {
          localStorage.setItem('omnichat_whatsapp_session_backup', JSON.stringify(data.backup));
          return data.backup;
        }
      }
    } catch (e) {
      console.warn('Could not backup WhatsApp session to localStorage:', e);
    }
    return null;
  }, []);

  // Restore WhatsApp session from local backup or SQLite
  const restoreWhatsAppSession = useCallback(
    async (backupData?: any): Promise<boolean> => {
      try {
        let payload = backupData;
        if (!payload && typeof window !== 'undefined') {
          const raw = localStorage.getItem('omnichat_whatsapp_session_backup');
          if (raw) {
            try {
              payload = JSON.parse(raw);
            } catch {
              // ignore
            }
          }
        }

        setBridges((prev) =>
          prev.map((b) => (b.id === 'whatsapp' ? { ...b, connectionState: 'connecting' } : b))
        );

        const res = await fetch('/api/whatsapp/session/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {}),
        });

        if (!res.ok) {
          return false;
        }

        const data = await res.json();
        if (data.success) {
          setInAppToast({
            id: `toast-${Date.now()}`,
            title: 'WhatsApp Bridge',
            body: data.message || 'Session restored from SQLite & browser backup!',
            service: 'whatsapp',
            roomId: '!wa-restore',
          });

          setTimeout(async () => {
            const statusRes = await fetch('/api/whatsapp/status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.connectionState === 'connected') {
                updateBridgeStatus('whatsapp', 'connected');
                syncWhatsAppChats();
                backupWhatsAppSession();
              }
            }
          }, 1500);

          return true;
        }
        return false;
      } catch (err) {
        console.warn('Auto restore error:', err);
        return false;
      }
    },
    [syncWhatsAppChats, updateBridgeStatus, backupWhatsAppSession]
  );

  const reconnectBridge = useCallback(
    async (serviceId: ServiceId) => {
      updateBridgeStatus(serviceId, 'connecting');
      if (serviceId === 'whatsapp') {
        const restored = await restoreWhatsAppSession();
        if (restored) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1400));
      updateBridgeStatus(serviceId, 'connected');
      playMessageSound('incoming');
    },
    [updateBridgeStatus, restoreWhatsAppSession]
  );

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      // If network condition transitioned from offline to online, flush queued messages!
      if (prev.networkCondition === 'offline' && next.networkCondition !== 'offline') {
        setTimeout(() => {
          setMessages((allMessages) => {
            const updated: Record<string, Message[]> = {};
            for (const [roomId, list] of Object.entries(allMessages)) {
              updated[roomId] = list.map((m) =>
                m.status === 'queued' ? { ...m, status: 'delivered' } : m
              );
            }
            return updated;
          });
        }, 400);
      }
      return next;
    });
  }, []);

  const simulateIncomingMessage = useCallback(
    (targetServiceId?: ServiceId) => {
      const eligibleConversations = targetServiceId
        ? conversations.filter((c) => c.service === targetServiceId)
        : conversations;

      if (eligibleConversations.length === 0) return;
      const targetRoom = eligibleConversations[Math.floor(Math.random() * eligibleConversations.length)];
      const sender = targetRoom.participants[0] || {
        id: `@ghost_${targetRoom.service}:homeserver.local`,
        name: 'Bridged Contact',
      };

      const sampleTexts = [
        'Hey! Did you check out the new unified bridge documentation?',
        'Synced message event received via mautrix application service.',
        'Push notifications are working smoothly across Android Doze state.',
        'Just verifying bridge reconnect handling. All looking solid!',
        'Can you review the pull request for the matrix-js-sdk migration?',
      ];
      const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
      const msgId = `sim-${Date.now()}`;

      const newMsg: Message = {
        id: msgId,
        roomId: targetRoom.roomId,
        senderId: sender.id,
        senderName: sender.name,
        isSelf: false,
        content: text,
        timestamp: Date.now(),
        status: targetRoom.roomId === activeRoomId ? 'read' : 'delivered',
        service: targetRoom.service,
        reactions: [],
      };

      setMessages((prev) => ({
        ...prev,
        [targetRoom.roomId]: [...(prev[targetRoom.roomId] || []), newMsg],
      }));

      setConversations((prev) =>
        prev.map((c) =>
          c.roomId === targetRoom.roomId
            ? {
                ...c,
                lastMessage: text,
                lastMessageSender: sender.name,
                lastActivityAt: Date.now(),
                unreadCount: targetRoom.roomId === activeRoomId ? 0 : c.unreadCount + 1,
              }
            : c
        )
      );

      // Trigger notification if not in active room
      if (targetRoom.roomId !== activeRoomId) {
        setInAppToast({
          id: msgId,
          title: `${sender.name} (${SERVICES_CONFIG[targetRoom.service].name})`,
          body: text,
          service: targetRoom.service,
          roomId: targetRoom.roomId,
        });

        showPushNotification({
          title: sender.name,
          body: text,
          service: targetRoom.service,
          roomId: targetRoom.roomId,
        });
      }
    },
    [conversations, activeRoomId]
  );

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        messages,
        activeRoomId,
        activeRoom,
        activeMessages,
        serviceFilter,
        unreadOnly,
        searchQuery,
        activeTab,
        bridges,
        settings,
        inAppToast,
        isTyping,
        setActiveRoomId,
        setServiceFilter,
        setUnreadOnly,
        setSearchQuery,
        setActiveTab,
        sendMessage,
        retryMessage,
        toggleReaction,
        deleteMessage,
        editMessage,
        markAsRead,
        togglePinConversation,
        toggleMuteConversation,
        updateBridgeStatus,
        reconnectBridge,
        updateSettings,
        simulateIncomingMessage,
        clearInAppToast,
        syncWhatsAppChats,
        isSyncingWhatsApp,
        restoreWhatsAppSession,
        backupWhatsAppSession,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within a MessagingProvider');
  return ctx;
};
