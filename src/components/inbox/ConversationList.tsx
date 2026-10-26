import React, { useMemo } from 'react';
import { Search, Plus, MessageSquareDashed, RefreshCw } from 'lucide-react';
import { useMessaging } from '../../context/MessagingContext';
import { ServiceFilterTabs } from './ServiceFilterTabs';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  onStartNewChat?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onStartNewChat }) => {
  const {
    conversations,
    activeRoomId,
    setActiveRoomId,
    serviceFilter,
    unreadOnly,
    searchQuery,
    setSearchQuery,
    syncWhatsAppChats,
    isSyncingWhatsApp,
  } = useMessaging();

  const filteredConversations = useMemo(() => {
    return conversations
      .filter((c) => {
        // Service filter
        if (serviceFilter !== 'all' && c.service !== serviceFilter) return false;
        // Unread filter
        if (unreadOnly && c.unreadCount === 0) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (c.title || '').toLowerCase().includes(q);
          const matchSnippet = (c.lastMessage || '').toLowerCase().includes(q);
          const matchParticipant = (c.participants || []).some((p) => (p?.name || '').toLowerCase().includes(q));
          if (!matchTitle && !matchSnippet && !matchParticipant) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned chats first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.lastActivityAt - a.lastActivityAt;
      });
  }, [conversations, serviceFilter, unreadOnly, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Top Search & Action Bar */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations & contacts..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {onStartNewChat && (
          <button
            onClick={onStartNewChat}
            className="min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0"
            title="Start new bridged conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <ServiceFilterTabs />

      {/* Live WhatsApp Sync Status Bar */}
      {serviceFilter === 'whatsapp' && (
        <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-1.5 truncate">
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncingWhatsApp ? 'animate-spin' : ''}`} />
            <span className="truncate font-medium">
              {isSyncingWhatsApp ? 'Syncing chats & groups...' : 'Live WhatsApp Multi-Device Sync'}
            </span>
          </div>
          <button
            onClick={() => {
              fetch('/api/whatsapp/sync', { method: 'POST' }).finally(() => syncWhatsAppChats());
            }}
            disabled={isSyncingWhatsApp}
            className="px-2.5 py-0.5 rounded-md font-semibold text-[11px] bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-slate-700 transition-colors shrink-0 shadow-2xs"
          >
            {isSyncingWhatsApp ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Conversation Item List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length > 0 ? (
          <div>
            {filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.roomId}
                conversation={conv}
                isSelected={activeRoomId === conv.roomId}
                onSelect={() => setActiveRoomId(conv.roomId)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <MessageSquareDashed className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              No conversations found
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different keyword.`
                : 'No bridged chats match the active service filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
