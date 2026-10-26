import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { BridgeInfo, ConnectionState, ConversationSummary, Message } from '../types';
import type { InAppToast } from '../context/MessagingContext';
import { playMessageSound, showPushNotification, triggerHaptic } from '../services/notificationService';

const mapConnectionState = (raw: string): ConnectionState =>
  raw === 'qr_ready' ? 'needs_auth' : (raw as ConnectionState);

export interface UseWhatsAppBridgeEventsParams {
  activeRoomIdRef: MutableRefObject<string | null>;
  syncWhatsAppChats: () => Promise<void>;
  backupWhatsAppSession: () => Promise<unknown>;
  setBridges: Dispatch<SetStateAction<BridgeInfo[]>>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setConversations: Dispatch<SetStateAction<ConversationSummary[]>>;
  setInAppToast: Dispatch<SetStateAction<InAppToast | null>>;
  onSseAlive?: () => void;
}

/**
 * Subscribes to WhatsApp bridge SSE push events and updates local conversation state immediately.
 * Reconnects with exponential backoff on stream errors.
 */
export function useWhatsAppBridgeEvents({
  activeRoomIdRef,
  syncWhatsAppChats,
  backupWhatsAppSession,
  setBridges,
  setMessages,
  setConversations,
  setInAppToast,
  onSseAlive,
}: UseWhatsAppBridgeEventsParams): void {
  const syncRef = useRef(syncWhatsAppChats);
  const backupRef = useRef(backupWhatsAppSession);
  const onSseAliveRef = useRef(onSseAlive);

  useEffect(() => {
    syncRef.current = syncWhatsAppChats;
    backupRef.current = backupWhatsAppSession;
    onSseAliveRef.current = onSseAlive;
  }, [syncWhatsAppChats, backupWhatsAppSession, onSseAlive]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let backoffMs = 1000;

    const applyWhatsAppConnectionState = (mappedState: ConnectionState, phone?: string) => {
      setBridges((prev) =>
        prev.map((b) =>
          b.id === 'whatsapp'
            ? {
                ...b,
                connectionState: mappedState,
                accountIdentifier: phone || b.accountIdentifier,
                lastSyncAt: Date.now(),
              }
            : b
        )
      );

      setConversations((prev) =>
        prev.map((c) => (c.service === 'whatsapp' ? { ...c, connectionState: mappedState } : c))
      );
    };

    const connect = () => {
      if (cancelled) return;

      try {
        eventSource = new EventSource('/api/whatsapp/events');

        eventSource.addEventListener('status_change', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (!data?.connectionState) return;

            const mappedState = mapConnectionState(data.connectionState);
            applyWhatsAppConnectionState(mappedState, data.phone);
            backoffMs = 1000;

            if (data.connectionState === 'connected') {
              syncRef.current();
              backupRef.current();
            }
          } catch (e) {
            console.warn('Error parsing SSE status_change:', e);
          }
        });

        eventSource.addEventListener('chats_updated', () => {
          syncRef.current();
        });

        eventSource.addEventListener('ping', () => {
          onSseAliveRef.current?.();
          setBridges((prev) =>
            prev.map((b) => (b.id === 'whatsapp' ? { ...b, lastSyncAt: Date.now() } : b))
          );
        });

        eventSource.addEventListener('message_received', (event: MessageEvent) => {
          try {
            const raw = JSON.parse(event.data);
            if (!raw?.roomId) return;

            const msg: Message = {
              ...raw,
              reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
            };
            const activeRoomId = activeRoomIdRef.current;

            setMessages((prev) => ({
              ...prev,
              [msg.roomId]: [...(prev[msg.roomId] || []), msg],
            }));

            let roomFound = false;
            setConversations((prev) => {
              roomFound = prev.some((c) => c.roomId === msg.roomId);
              if (!roomFound) return prev;
              return prev.map((c) =>
                c.roomId === msg.roomId
                  ? {
                      ...c,
                      lastMessage: msg.content,
                      lastMessageSender: msg.senderName,
                      lastActivityAt: msg.timestamp,
                      unreadCount: c.roomId === activeRoomId ? 0 : c.unreadCount + 1,
                    }
                  : c
              );
            });

            if (!roomFound) {
              syncRef.current();
            }

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
          } catch (e) {
            console.warn('Error parsing message_received SSE:', e);
          }
        });

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (cancelled) return;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            backoffMs = Math.min(backoffMs * 2, 30_000);
            connect();
          }, backoffMs);
        };

        eventSource.onopen = () => {
          backoffMs = 1000;
          onSseAliveRef.current?.();
        };
      } catch {
        if (cancelled) return;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          backoffMs = Math.min(backoffMs * 2, 30_000);
          connect();
        }, backoffMs);
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [activeRoomIdRef, setBridges, setMessages, setConversations, setInAppToast]);
}
