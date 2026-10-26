import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WAMessage,
  GroupMetadata,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { sqliteAuthStore } from './src/server/sqliteAuthStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_DIR = path.join(__dirname, '.baileys_auth');
const DATA_STORE_FILE = path.join(__dirname, '.whatsapp_data_store.json');

app.use(express.json());

// Server-Sent Events clients
const sseClients: Response[] = [];

const broadcastSSE = (event: string, data: unknown) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      // Ignore closed sockets
    }
  }
};

// WhatsApp In-Memory Data Store (Persisted to JSON)
export interface WhatsAppChatRecord {
  jid: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage: string;
  lastMessageSender: string;
  lastActivityAt: number;
  participantsCount?: number;
  avatarUrl?: string;
  participants?: {
    id: string;
    name: string;
    isOnline: boolean;
    role?: 'admin' | 'member';
    nativePlatformUsername?: string;
  }[];
}

export interface WhatsAppMessageRecord {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  isSelf: boolean;
  content: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'queued';
  service: 'whatsapp';
  reactions?: any[];
  attachment?: {
    id: string;
    type: 'image' | 'video' | 'audio' | 'file';
    url: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
  };
}

let chatsStore: Map<string, WhatsAppChatRecord> = new Map();
let contactsStore: Map<string, { id: string; name: string; notify?: string }> = new Map();
let messagesStore: Map<string, WhatsAppMessageRecord[]> = new Map();

// Load persistent data store if available
try {
  if (fs.existsSync(DATA_STORE_FILE)) {
    const raw = fs.readFileSync(DATA_STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.chats) {
      chatsStore = new Map(Object.entries(parsed.chats));
    }
    if (parsed.contacts) {
      contactsStore = new Map(Object.entries(parsed.contacts));
    }
    if (parsed.messages) {
      const sanitizedEntries: [string, WhatsAppMessageRecord[]][] = Object.entries(parsed.messages).map(
        ([jid, msgs]) => [
          jid,
          (Array.isArray(msgs) ? msgs : []).map((m: any) => ({
            ...m,
            reactions: Array.isArray(m.reactions) ? m.reactions : [],
          })),
        ]
      );
      messagesStore = new Map(sanitizedEntries);
    }
  }
} catch (e) {
  console.warn('Could not read existing WhatsApp data store:', e);
}

const saveDataStore = () => {
  try {
    const data = {
      chats: Object.fromEntries(chatsStore),
      contacts: Object.fromEntries(contactsStore),
      messages: Object.fromEntries(messagesStore),
    };
    fs.writeFileSync(DATA_STORE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving WhatsApp data store:', e);
  }
};

// State
let sock: ReturnType<typeof makeWASocket> | null = null;
let currentQrString = '';
let currentQrDataUrl = '';
let connectionState: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' = 'connecting';
let connectedPhone = sqliteAuthStore.getMeta('connectedPhone') || '639945864387';
let connectedName = sqliteAuthStore.getMeta('connectedName') || '+639945864387';
const startTime = Date.now();
let lastSyncAt = Date.now();

// Helper to get formatted contact name
const getContactName = (jid: string): string => {
  const contact = contactsStore.get(jid);
  if (contact?.name) return contact.name;
  if (contact?.notify) return contact.notify;
  const num = jid.split('@')[0];
  return `+${num}`;
};

// Helper to extract message content text
const extractMessageText = (msg: WAMessage): string => {
  const m = msg.message;
  if (!m) return '';
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.imageMessage) return '[Photo]';
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.videoMessage) return '[Video]';
  if (m.audioMessage) return '[Voice note]';
  if (m.documentMessage) return `[File] ${m.documentMessage.fileName || 'Document'}`;
  return '';
};

// Helper to extract message media attachment
const extractMessageAttachment = (msg: WAMessage): WhatsAppMessageRecord['attachment'] => {
  const m = msg.message;
  if (!m) return undefined;
  if (m.imageMessage) {
    return {
      id: `wa-att-${msg.key.id || Date.now()}`,
      type: 'image',
      url: m.imageMessage.url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      name: m.imageMessage.caption || 'image.jpg',
      sizeBytes: Number(m.imageMessage.fileLength || 1024 * 100),
      mimeType: m.imageMessage.mimetype || 'image/jpeg',
    };
  }
  if (m.documentMessage) {
    return {
      id: `wa-att-${msg.key.id || Date.now()}`,
      type: 'file',
      url: '#',
      name: m.documentMessage.fileName || 'document.pdf',
      sizeBytes: Number(m.documentMessage.fileLength || 1024 * 200),
      mimeType: m.documentMessage.mimetype || 'application/pdf',
    };
  }
  if (m.audioMessage) {
    return {
      id: `wa-att-${msg.key.id || Date.now()}`,
      type: 'audio',
      url: '#',
      name: 'voice_note.ogg',
      sizeBytes: Number(m.audioMessage.fileLength || 1024 * 50),
      mimeType: m.audioMessage.mimetype || 'audio/ogg',
    };
  }
  if (m.videoMessage) {
    return {
      id: `wa-att-${msg.key.id || Date.now()}`,
      type: 'video',
      url: '#',
      name: m.videoMessage.caption || 'video.mp4',
      sizeBytes: Number(m.videoMessage.fileLength || 1024 * 500),
      mimeType: m.videoMessage.mimetype || 'video/mp4',
    };
  }
  return undefined;
};

// Helper to sync all participating groups
async function syncGroups() {
  if (!sock) return;
  try {
    const groups: Record<string, GroupMetadata> = await sock.groupFetchAllParticipating();
    for (const [jid, metadata] of Object.entries(groups)) {
      const existing = chatsStore.get(jid);
      const participantsList = (metadata.participants || []).map((p) => ({
        id: p.id,
        name: getContactName(p.id),
        isOnline: false,
        role: (p.admin ? 'admin' : 'member') as 'admin' | 'member',
        nativePlatformUsername: p.id.split('@')[0],
      }));

      chatsStore.set(jid, {
        jid,
        name: metadata.subject || 'WhatsApp Group',
        isGroup: true,
        unreadCount: existing?.unreadCount || 0,
        lastMessage: existing?.lastMessage || 'Group active',
        lastMessageSender: existing?.lastMessageSender || '',
        lastActivityAt: existing?.lastActivityAt || (metadata.creation ? metadata.creation * 1000 : Date.now()),
        participantsCount: metadata.participants?.length || participantsList.length,
        avatarUrl: existing?.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=160&q=80',
        participants: participantsList,
      });
    }
    saveDataStore();
    broadcastSSE('chats_updated', { count: chatsStore.size });
  } catch (err) {
    console.warn('Group sync error:', err);
  }
}

// Initialize Baileys Multi-Device Socket
async function initBaileys() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    // Auto-restore from SQLite if creds.json is missing in AUTH_DIR
    const credsFile = path.join(AUTH_DIR, 'creds.json');
    if (!fs.existsSync(credsFile) && sqliteAuthStore.hasCreds()) {
      console.log('Restoring WhatsApp credentials from SQLite into auth directory...');
      const restored = sqliteAuthStore.restoreDbToDirectory(AUTH_DIR);
      console.log(`Restored ${restored} session files from SQLite.`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      syncFullHistory: true, // Request full companion message history backfill
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      // Mirror to SQLite
      sqliteAuthStore.syncDirectoryToDb(AUTH_DIR);
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQrString = qr;
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 280,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          connectionState = 'qr_ready';
          broadcastSSE('qr_update', {
            qrDataUrl: currentQrDataUrl,
            rawString: currentQrString,
          });
        } catch (err) {
          console.error('Failed to encode QR Data URL:', err);
        }
      }

      if (connection === 'connecting') {
        connectionState = 'connecting';
        broadcastSSE('status_change', { connectionState: 'connecting' });
      }

      if (connection === 'open') {
        connectionState = 'connected';
        lastSyncAt = Date.now();

        // Extract user identity
        const userJid = sock?.user?.id || '';
        const phoneFromJid = userJid.split(':')[0].split('@')[0];
        if (phoneFromJid) {
          connectedPhone = phoneFromJid;
        }
        connectedName = sock?.user?.name || `+${connectedPhone}`;

        // Save metadata into SQLite
        sqliteAuthStore.setMeta('connectedPhone', connectedPhone);
        sqliteAuthStore.setMeta('connectedName', connectedName);
        sqliteAuthStore.setMeta('status', 'connected');
        sqliteAuthStore.syncDirectoryToDb(AUTH_DIR);

        broadcastSSE('status_change', {
          connectionState: 'connected',
          phone: `+${connectedPhone}`,
          name: connectedName,
        });

        // Trigger active group and chat fetch
        setTimeout(() => syncGroups(), 2000);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`WhatsApp connection closed. Status code: ${statusCode}, shouldReconnect: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          connectionState = 'disconnected';
          currentQrDataUrl = '';
          currentQrString = '';
          // Retain SQLite keys so user can restore or inspect if desired
          broadcastSSE('status_change', {
            connectionState: 'disconnected',
            phone: connectedPhone ? `+${connectedPhone}` : undefined,
          });
          setTimeout(() => initBaileys(), 4000);
        } else if (shouldReconnect) {
          connectionState = 'connecting';
          setTimeout(() => initBaileys(), 3000);
        }
      }
    });

    // 1. Initial WhatsApp Companion History Sync Event
    sock.ev.on('messaging-history.set', ({ chats, contacts, messages: historyMsgs }) => {
      // Record contacts
      if (contacts) {
        for (const c of contacts) {
          if (c.id) {
            contactsStore.set(c.id, {
              id: c.id,
              name: c.name || c.notify || c.verifiedName || '',
              notify: c.notify,
            });
          }
        }
      }

      // Record chats
      if (chats) {
        for (const chat of chats) {
          if (!chat.id) continue;
          const isGroup = chat.id.endsWith('@g.us');
          const name = chat.name || getContactName(chat.id);
          const timestamp = Number(chat.conversationTimestamp || Math.floor(Date.now() / 1000)) * 1000;

          chatsStore.set(chat.id, {
            jid: chat.id,
            name: name || (isGroup ? 'WhatsApp Group' : chat.id.split('@')[0]),
            isGroup,
            unreadCount: chat.unreadCount || 0,
            lastMessage: 'Chat synced',
            lastMessageSender: '',
            lastActivityAt: timestamp || Date.now(),
            avatarUrl: isGroup
              ? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=160&q=80'
              : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
          });
        }
      }

      // Record messages
      if (historyMsgs) {
        for (const msg of historyMsgs) {
          const remoteJid = msg.key.remoteJid;
          if (!remoteJid) continue;

          const text = extractMessageText(msg);
          if (!text) continue;

          const fromMe = msg.key.fromMe || false;
          const senderId = msg.key.participant || remoteJid;
          const senderName = fromMe ? 'You' : getContactName(senderId);
          const timestamp = Number(msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000;

          // Update chat last message
          const existingChat = chatsStore.get(remoteJid);
          if (existingChat) {
            existingChat.lastMessage = text;
            existingChat.lastMessageSender = senderName;
            if (timestamp > existingChat.lastActivityAt) {
              existingChat.lastActivityAt = timestamp;
            }
            chatsStore.set(remoteJid, existingChat);
          }

          const attachment = extractMessageAttachment(msg);

          const record: WhatsAppMessageRecord = {
            id: msg.key.id || `msg-${Date.now()}`,
            roomId: remoteJid,
            senderId,
            senderName,
            isSelf: fromMe,
            content: text,
            timestamp,
            status: fromMe ? 'delivered' : 'read',
            service: 'whatsapp',
            reactions: [],
            attachment,
          };

          const list = messagesStore.get(remoteJid) || [];
          if (!list.some((m) => m.id === record.id)) {
            list.push(record);
            messagesStore.set(remoteJid, list);
          }
        }
      }

      saveDataStore();
      broadcastSSE('chats_updated', { count: chatsStore.size });
    });

    // 2. Continuous Chat Updates
    sock.ev.on('chats.upsert', (newChats) => {
      for (const chat of newChats) {
        if (!chat.id) continue;
        const isGroup = chat.id.endsWith('@g.us');
        const name = chat.name || getContactName(chat.id);
        const existing = chatsStore.get(chat.id);

        chatsStore.set(chat.id, {
          jid: chat.id,
          name: name || existing?.name || (isGroup ? 'WhatsApp Group' : `+${chat.id.split('@')[0]}`),
          isGroup,
          unreadCount: chat.unreadCount ?? existing?.unreadCount ?? 0,
          lastMessage: existing?.lastMessage || 'Synced chat',
          lastMessageSender: existing?.lastMessageSender || '',
          lastActivityAt: existing?.lastActivityAt || Date.now(),
        });
      }
      saveDataStore();
      broadcastSSE('chats_updated', { count: chatsStore.size });
    });

    // 3. Continuous Contact Updates
    sock.ev.on('contacts.upsert', (newContacts) => {
      for (const c of newContacts) {
        if (c.id) {
          contactsStore.set(c.id, {
            id: c.id,
            name: c.name || c.notify || c.verifiedName || '',
            notify: c.notify,
          });

          // Update chat name if matching
          const chat = chatsStore.get(c.id);
          if (chat && !chat.isGroup && (c.name || c.notify)) {
            chat.name = c.name || c.notify || chat.name;
            chatsStore.set(c.id, chat);
          }
        }
      }
      saveDataStore();
      broadcastSSE('chats_updated', { count: chatsStore.size });
    });

    // 4. Live Incoming & Outgoing Messages
    sock.ev.on('messages.upsert', ({ messages: newMessages, type }) => {
      for (const msg of newMessages) {
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) continue;

        const content = extractMessageText(msg);
        if (!content) continue;

        const fromMe = msg.key.fromMe || false;
        const senderId = msg.key.participant || remoteJid;
        const senderName = fromMe ? 'You' : getContactName(senderId);
        const timestamp = Number(msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000;
        const isGroup = remoteJid.endsWith('@g.us');

        // Update or create chat in store
        const existingChat = chatsStore.get(remoteJid);
        const chatName = existingChat?.name || (isGroup ? 'WhatsApp Group' : getContactName(remoteJid));

        chatsStore.set(remoteJid, {
          jid: remoteJid,
          name: chatName,
          isGroup,
          unreadCount: fromMe ? 0 : (existingChat?.unreadCount || 0) + 1,
          lastMessage: content,
          lastMessageSender: senderName,
          lastActivityAt: timestamp,
          avatarUrl: existingChat?.avatarUrl,
        });

        const attachment = extractMessageAttachment(msg);

        // Add to messages store
        const newRecord: WhatsAppMessageRecord = {
          id: msg.key.id || `msg-${Date.now()}`,
          roomId: remoteJid,
          senderId,
          senderName,
          isSelf: fromMe,
          content,
          timestamp,
          status: fromMe ? 'delivered' : 'read',
          service: 'whatsapp',
          reactions: [],
          attachment,
        };

        const list = messagesStore.get(remoteJid) || [];
        if (!list.some((m) => m.id === newRecord.id)) {
          list.push(newRecord);
          messagesStore.set(remoteJid, list);
        }

        saveDataStore();

        // Broadcast real-time message event
        broadcastSSE('message_received', newRecord);
        broadcastSSE('chats_updated', { count: chatsStore.size });
      }
    });
  } catch (err) {
    console.error('Error starting Baileys socket:', err);
    connectionState = 'disconnected';
  }
}

// Start Baileys immediately
initBaileys();

// -------------------------------------------------------------
// WhatsApp Bridge API Routes
// -------------------------------------------------------------

// 1. Status
app.get('/api/whatsapp/status', (_req: Request, res: Response) => {
  const sqliteKeysCount = sqliteAuthStore.getAuthKeyCount();
  const hasCreds = sqliteAuthStore.hasCreds();
  res.json({
    connectionState,
    phone: connectedPhone ? `+${connectedPhone}` : sqliteAuthStore.getMeta('connectedPhone') || '+639945864387',
    name: connectedName || sqliteAuthStore.getMeta('connectedName') || '+639945864387',
    platform: 'WhatsApp Multi-Device / Baileys',
    lastSyncAt,
    uptimeHours: Math.max(1, Math.round((Date.now() - startTime) / (3600 * 1000))),
    hasQr: Boolean(currentQrDataUrl),
    syncedChatsCount: chatsStore.size,
    persistence: {
      sqliteActive: true,
      sqliteKeysCount,
      hasCreds,
      databasePath: '.whatsapp_session.db',
    },
  });
});

// 1b. Lightweight latency probe (no chat sync)
app.get('/api/whatsapp/ping', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    connectionState,
    phone: connectedPhone ? `+${connectedPhone}` : sqliteAuthStore.getMeta('connectedPhone') || '+639945864387',
    serverTime: Date.now(),
  });
});

// 2. Fetch Synced Real WhatsApp Chats & Groups
app.get('/api/whatsapp/chats', (_req: Request, res: Response) => {
  const chatsList = Array.from(chatsStore.values()).sort(
    (a, b) => b.lastActivityAt - a.lastActivityAt
  );

  // If connected but chatsStore is still awaiting initial sync chunks, generate participating groups or fallback preview
  if (chatsList.length === 0 && connectionState === 'connected') {
    // Sync groups immediately
    syncGroups().catch(() => {});
  }

  res.json({
    success: true,
    connectionState,
    count: chatsList.length,
    chats: chatsList,
  });
});

// 3. Fetch Real Messages for Chat
app.get('/api/whatsapp/messages/:jid', (req: Request, res: Response) => {
  const jid = req.params.jid;
  const rawList = messagesStore.get(jid) || [];
  const messages = rawList.map((m) => ({
    ...m,
    reactions: Array.isArray(m.reactions) ? m.reactions : [],
  }));
  res.json({
    success: true,
    jid,
    messages: messages.sort((a, b) => a.timestamp - b.timestamp),
  });
});

// 4. Scannable QR Code
app.get('/api/whatsapp/qr', async (_req: Request, res: Response) => {
  if (currentQrDataUrl) {
    res.json({
      success: true,
      rawString: currentQrString,
      qrDataUrl: currentQrDataUrl,
      expiresInSeconds: 20,
    });
    return;
  }

  res.json({
    success: false,
    message: 'QR code not ready yet, socket initializing',
    connectionState,
  });
});

// 5. Real WhatsApp Server Pairing Code
app.post('/api/whatsapp/pair-code', async (req: Request, res: Response) => {
  const rawPhone = String(req.body.phone || '');
  const cleanPhone = rawPhone.replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 8) {
    res.status(400).json({
      success: false,
      error: 'Please enter a valid international phone number with country code (e.g. +639945864387).',
    });
    return;
  }

  if (!sock) {
    res.status(503).json({ success: false, error: 'WhatsApp service initializing, please retry in a moment.' });
    return;
  }

  try {
    const code = await sock.requestPairingCode(cleanPhone);
    const formatted =
      code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

    res.json({
      success: true,
      phone: cleanPhone,
      pairingCode: formatted,
      rawCode: code,
      expiresInSeconds: 120,
      instructions:
        'In WhatsApp on your phone: Tap Settings > Linked Devices > Link a Device > Link with phone number instead, then enter this code.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Baileys requestPairingCode error:', error);
    res.status(500).json({
      success: false,
      error:
        error?.message ||
        'Failed to request pairing code from WhatsApp servers. Please verify phone number and retry.',
    });
  }
});

// 6. Manual Sync Trigger
app.post('/api/whatsapp/sync', async (_req: Request, res: Response) => {
  if (connectionState !== 'connected') {
    res.status(400).json({ success: false, error: 'WhatsApp is not currently connected' });
    return;
  }

  try {
    await syncGroups();
    res.json({
      success: true,
      message: 'WhatsApp sync triggered',
      syncedChatsCount: chatsStore.size,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Verify / Confirm Connection
app.post('/api/whatsapp/verify', (req: Request, res: Response) => {
  const { phone, name } = req.body;

  if (phone) {
    const clean = String(phone).replace(/\D/g, '');
    connectedPhone = clean || connectedPhone;
    sqliteAuthStore.setMeta('connectedPhone', connectedPhone);
  }
  if (name) {
    connectedName = String(name);
    sqliteAuthStore.setMeta('connectedName', connectedName);
  }

  sqliteAuthStore.setMeta('status', 'connected');
  sqliteAuthStore.syncDirectoryToDb(AUTH_DIR);

  connectionState = 'connected';
  lastSyncAt = Date.now();

  broadcastSSE('status_change', {
    connectionState: 'connected',
    phone: connectedPhone ? `+${connectedPhone}` : '+639945864387',
    name: connectedName || '+639945864387',
  });

  syncGroups().catch(() => {});

  res.json({
    success: true,
    message: 'WhatsApp session verified and active',
    session: {
      connectionState,
      phone: connectedPhone,
      name: connectedName,
    },
  });
});

// 8. Session Backup (for client-side browser localStorage backup)
app.get('/api/whatsapp/session/backup', (_req: Request, res: Response) => {
  try {
    sqliteAuthStore.syncDirectoryToDb(AUTH_DIR);
    const keys = sqliteAuthStore.getAllAuthKeys();
    const phone = connectedPhone || sqliteAuthStore.getMeta('connectedPhone') || '639945864387';
    const name = connectedName || sqliteAuthStore.getMeta('connectedName') || '+639945864387';

    res.json({
      success: true,
      backup: {
        keys,
        phone,
        name,
        timestamp: Date.now(),
        keysCount: Object.keys(keys).length,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Session Restore (from client-side browser backup or SQLite)
app.post('/api/whatsapp/session/restore', async (req: Request, res: Response) => {
  try {
    const { keys, phone, name } = req.body || {};

    let restoredCount = 0;
    if (keys && typeof keys === 'object' && Object.keys(keys).length > 0) {
      // Import client provided backup keys into SQLite & AUTH_DIR
      restoredCount = sqliteAuthStore.importKeys(keys);
      sqliteAuthStore.restoreDbToDirectory(AUTH_DIR);
    } else if (sqliteAuthStore.hasCreds()) {
      // Restore directly from SQLite database file
      restoredCount = sqliteAuthStore.restoreDbToDirectory(AUTH_DIR);
    } else {
      res.status(400).json({
        success: false,
        error: 'No valid session keys in backup and no credentials found in SQLite database.',
      });
      return;
    }

    if (phone) {
      connectedPhone = String(phone).replace(/\D/g, '');
      sqliteAuthStore.setMeta('connectedPhone', connectedPhone);
    }
    if (name) {
      connectedName = String(name);
      sqliteAuthStore.setMeta('connectedName', connectedName);
    }

    // Terminate existing socket and restart with restored keys
    try {
      if (sock) {
        sock.end(undefined);
      }
    } catch {
      // Ignore
    }

    connectionState = 'connecting';
    broadcastSSE('status_change', {
      connectionState: 'connecting',
      phone: connectedPhone ? `+${connectedPhone}` : '+639945864387',
      name: connectedName,
    });

    await initBaileys();

    res.json({
      success: true,
      message: `Restored ${restoredCount} credentials into SQLite and active session. Reconnecting...`,
      keysCount: restoredCount,
      phone: `+${connectedPhone}`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Session restore error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Refresh QR Code
app.post('/api/whatsapp/qr/refresh', async (_req: Request, res: Response) => {
  try {
    try {
      if (sock) {
        sock.end(undefined);
      }
    } catch {
      // Ignore
    }
    connectionState = 'connecting';
    broadcastSSE('status_change', { connectionState: 'connecting' });
    await initBaileys();
    res.json({ success: true, message: 'QR refresh initiated' });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Persistence Diagnostic Status
app.get('/api/whatsapp/persistence/status', (_req: Request, res: Response) => {
  const count = sqliteAuthStore.getAuthKeyCount();
  const hasCreds = sqliteAuthStore.hasCreds();
  res.json({
    success: true,
    sqlite: {
      active: true,
      keysCount: count,
      hasCreds,
      databaseFile: '.whatsapp_session.db',
    },
    connectionState,
    phone: connectedPhone ? `+${connectedPhone}` : sqliteAuthStore.getMeta('connectedPhone') || '+639945864387',
    name: connectedName || sqliteAuthStore.getMeta('connectedName'),
    lastSyncAt,
  });
});

// 8. Disconnect
app.post('/api/whatsapp/disconnect', async (_req: Request, res: Response) => {
  connectionState = 'disconnected';
  connectedPhone = '';
  connectedName = '';
  currentQrDataUrl = '';
  currentQrString = '';
  chatsStore.clear();
  contactsStore.clear();
  messagesStore.clear();

  try {
    if (sock) {
      await sock.logout();
    }
  } catch {
    // Ignore error
  }

  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    if (fs.existsSync(DATA_STORE_FILE)) {
      fs.unlinkSync(DATA_STORE_FILE);
    }
  } catch {
    // Ignore error
  }

  broadcastSSE('status_change', { connectionState: 'disconnected' });
  broadcastSSE('chats_updated', { count: 0 });

  setTimeout(() => initBaileys(), 2000);

  res.json({
    success: true,
    message: 'WhatsApp session disconnected. All local chats cleared.',
  });
});

// 9. SSE Event Stream
app.get('/api/whatsapp/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial state
  res.write(
    `event: status_change\ndata: ${JSON.stringify({
      connectionState,
      phone: connectedPhone ? `+${connectedPhone}` : '+639945864387',
      name: connectedName,
    })}\n\n`
  );

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Keep SSE clients / proxies from idle-dropping the stream
setInterval(() => {
  if (sseClients.length === 0) return;
  broadcastSSE('ping', {
    serverTime: Date.now(),
    connectionState,
  });
}, 15_000);

// 10. Send Message
app.post('/api/whatsapp/messages/send', async (req: Request, res: Response) => {
  const { content, recipientPhone, roomId } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Message content required' });
    return;
  }

  const targetJid = roomId?.includes('@')
    ? roomId
    : recipientPhone
    ? `${String(recipientPhone).replace(/\D/g, '')}@s.whatsapp.net`
    : null;

  try {
    let msgId = `wa-${Date.now()}`;
    if (sock && connectionState === 'connected' && targetJid) {
      const result = await sock.sendMessage(targetJid, { text: content });
      if (result?.key?.id) {
        msgId = result.key.id;
      }
    }

    // Save outbound message to store
    if (targetJid) {
      const existing = chatsStore.get(targetJid);
      if (existing) {
        existing.lastMessage = content;
        existing.lastMessageSender = 'You';
        existing.lastActivityAt = Date.now();
        chatsStore.set(targetJid, existing);
      }

      const list = messagesStore.get(targetJid) || [];
      const newOutbound: WhatsAppMessageRecord = {
        id: msgId,
        roomId: targetJid,
        senderId: 'self',
        senderName: 'You',
        isSelf: true,
        content,
        timestamp: Date.now(),
        status: 'delivered',
        service: 'whatsapp',
        reactions: [],
      };
      list.push(newOutbound);
      messagesStore.set(targetJid, list);
      saveDataStore();
    }

    res.json({
      success: true,
      messageId: msgId,
      timestamp: Date.now(),
      status: 'delivered',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// Vite Frontend Middleware / Static Serving
// -------------------------------------------------------------
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`OmniChat full-stack server running on http://localhost:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
});
