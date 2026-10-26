import React, { useState, useMemo } from 'react';
import { Search, X, MessageSquare, ArrowRight } from 'lucide-react';
import { useMessaging } from '../../context/MessagingContext';
import { ServiceId } from '../../types';
import { ServiceBadge } from '../common/ServiceBadge';

export const GlobalSearchModal: React.FC = () => {
  const { conversations, messages, setActiveRoomId, setActiveTab } = useMessaging();
  const [query, setQuery] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceId | 'all'>('all');

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const results: {
      messageId: string;
      roomId: string;
      roomTitle: string;
      service: ServiceId;
      senderName: string;
      content: string;
      timestamp: number;
    }[] = [];

    for (const conv of conversations) {
      if (selectedService !== 'all' && conv.service !== selectedService) continue;

      const roomMsgs = messages[conv.roomId] || [];
      for (const m of roomMsgs) {
        if (m.content.toLowerCase().includes(q)) {
          results.push({
            messageId: m.id,
            roomId: conv.roomId,
            roomTitle: conv.title,
            service: conv.service,
            senderName: m.senderName,
            content: m.content,
            timestamp: m.timestamp,
          });
        }
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }, [query, selectedService, conversations, messages]);

  const handleSelectResult = (roomId: string) => {
    setActiveRoomId(roomId);
    setActiveTab('inbox');
  };

  const services: { id: ServiceId | 'all'; label: string }[] = [
    { id: 'all', label: 'All Services' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'discord', label: 'Discord' },
    { id: 'messenger', label: 'Messenger' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'matrix', label: 'Matrix' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Search Input Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all messages, bridges, and rooms..."
            className="w-full pl-11 pr-10 py-3 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {services.map((srv) => (
            <button
              key={srv.id}
              onClick={() => setSelectedService(srv.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedService === srv.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {srv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
        {query.trim() === '' ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Type keywords above to search across message contents, bridged chats, and contacts.
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map((res) => (
            <button
              key={res.messageId}
              onClick={() => handleSelectResult(res.roomId)}
              className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start justify-between gap-4 group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ServiceBadge service={res.service} size="xs" />
                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {res.roomTitle}
                  </span>
                  <span className="text-[11px] text-slate-400">· {res.senderName}</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {res.content}
                </p>

                <span className="text-[10px] font-mono tabular-nums text-slate-400 block">
                  {new Date(res.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="p-1.5 rounded-lg text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            No matching messages found for "{query}".
          </div>
        )}
      </div>
    </div>
  );
};
