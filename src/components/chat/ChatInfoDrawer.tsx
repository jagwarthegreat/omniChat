import React from 'react';
import {
  X,
  Lock,
  ShieldAlert,
  Pin,
  BellOff,
  Bell,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Users,
} from 'lucide-react';
import { ConversationSummary } from '../../types';
import { ServiceBadge } from '../common/ServiceBadge';
import { SERVICES_CONFIG } from '../../config/services';
import { useMessaging } from '../../context/MessagingContext';

interface ChatInfoDrawerProps {
  conversation: ConversationSummary;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatInfoDrawer: React.FC<ChatInfoDrawerProps> = ({
  conversation,
  isOpen,
  onClose,
}) => {
  const { togglePinConversation, toggleMuteConversation, reconnectBridge } = useMessaging();
  const meta = SERVICES_CONFIG[conversation.service];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 md:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Conversation Info
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-600 dark:text-slate-300">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="relative mb-2">
            {conversation.avatarUrl ? (
              <img
                src={conversation.avatarUrl}
                alt={conversation.title}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xl">
                {conversation.title.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 ring-2 ring-white dark:ring-slate-900 rounded-md">
              <ServiceBadge service={conversation.service} size="sm" />
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {conversation.title}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bridged via {meta.bridgePackage}
          </p>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => togglePinConversation(conversation.roomId)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                conversation.isPinned
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>{conversation.isPinned ? 'Pinned' : 'Pin'}</span>
            </button>

            <button
              onClick={() => toggleMuteConversation(conversation.roomId)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                conversation.isMuted
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {conversation.isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              <span>{conversation.isMuted ? 'Muted' : 'Mute'}</span>
            </button>
          </div>
        </div>

        {/* Bridge & Protocol Identifiers */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 block">
            Protocol Identifiers
          </span>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Matrix Room ID:</span>
              <span className="text-slate-800 dark:text-slate-200 break-all select-all">
                {conversation.roomId}
              </span>
            </div>
            {conversation.nativeChatId && (
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {meta.name} Native Channel / ID:
                </span>
                <span className="text-slate-800 dark:text-slate-200 break-all select-all">
                  {conversation.nativeChatId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Security / Trust Boundary */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 block">
            Cryptographic Status
          </span>
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              conversation.isEncrypted
                ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            {conversation.isEncrypted ? (
              <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">
                {conversation.isEncrypted ? 'Native Matrix E2EE' : 'Bridged Appservice Relay'}
              </p>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {conversation.bridgeTrustNotice || meta.securityNotice}
              </p>
            </div>
          </div>
        </div>

        {/* Room Capabilities */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 block">
            Bridge Capabilities
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Send Text', val: conversation.capabilities.sendText },
              { label: 'Send Media', val: conversation.capabilities.sendMedia },
              { label: 'Reactions', val: conversation.capabilities.reactions },
              { label: 'Edits', val: conversation.capabilities.edits },
              { label: 'Replies', val: conversation.capabilities.replies },
              { label: 'Read Receipts', val: conversation.capabilities.readReceipts },
              { label: 'Voice Notes', val: conversation.capabilities.voiceNotes },
              { label: 'Group Chats', val: conversation.capabilities.groupChats },
            ].map((cap, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px]"
              >
                {cap.val ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className={cap.val ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}>
                  {cap.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
              Participants ({(conversation.participants?.length || 0)})
            </span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/30">
            {(conversation.participants || []).map((p) => (
              <div key={p.id} className="p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center text-xs shrink-0">
                    {(p.name || 'WA').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {p.nativePlatformUsername || p.id}
                    </p>
                  </div>
                </div>

                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    p.isOnline ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  title={p.isOnline ? 'Online' : 'Offline'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Reconnect Bridge Action */}
        <div className="pt-2">
          <button
            onClick={() => reconnectBridge(conversation.service)}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reconnect {meta.name} Bridge</span>
          </button>
        </div>
      </div>
    </div>
  );
};
