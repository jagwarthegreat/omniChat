import React from 'react';
import { Pin, BellOff, Lock, AlertTriangle } from 'lucide-react';
import { ConversationSummary } from '../../types';
import { ServiceBadge } from '../common/ServiceBadge';

interface ConversationItemProps {
  conversation: ConversationSummary;
  isSelected: boolean;
  onSelect: () => void;
  onRevalidate?: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onSelect,
  onRevalidate,
}) => {
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const date = new Date(timestamp);
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isDegraded = conversation.connectionState !== 'connected';

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors border-b border-slate-100 dark:border-slate-800/60 relative group min-h-[68px] ${
        isSelected
          ? 'bg-teal-500/10 dark:bg-teal-500/15'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}
    >
      {/* Avatar Container with Service Badge Overlay */}
      <div className="relative shrink-0 mt-0.5">
        {conversation.avatarUrl ? (
          <img
            src={conversation.avatarUrl}
            alt={conversation.title}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center text-base">
            {conversation.title.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="absolute -bottom-1 -right-1 ring-2 ring-white dark:ring-slate-900 rounded-md">
          <ServiceBadge service={conversation.service} size="xs" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {conversation.isPinned && (
              <Pin className="w-3.5 h-3.5 text-slate-400 rotate-45 shrink-0" />
            )}
            {conversation.isEncrypted && (
              <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            )}
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {conversation.title}
            </h3>
          </div>

          <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
            {formatTime(conversation.lastActivityAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {conversation.lastMessageSender && (
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {conversation.lastMessageSender}:{' '}
              </span>
            )}
            {conversation.lastMessage || 'No messages yet'}
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.connectionState === 'needs_auth' ? (
              <span
                role="button"
                tabIndex={0}
                title="Bridge requires manual re-validation"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevalidate?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onRevalidate?.();
                  }
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                Re-validate
              </span>
            ) : (
              isDegraded && (
                <span
                  title="Bridge degraded or requires re-authentication"
                  className="text-amber-500"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              )
            )}

            {conversation.isMuted && (
              <BellOff className="w-3 h-3 text-slate-400" />
            )}

            {conversation.unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-teal-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
