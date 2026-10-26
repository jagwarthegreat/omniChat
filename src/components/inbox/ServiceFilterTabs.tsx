import React from 'react';
import { useMessaging } from '../../context/MessagingContext';
import { ServiceId } from '../../types';
import { SERVICES_CONFIG } from '../../config/services';

export const ServiceFilterTabs: React.FC = () => {
  const { serviceFilter, setServiceFilter, unreadOnly, setUnreadOnly, conversations } = useMessaging();

  const services: { id: ServiceId | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'discord', label: 'Discord' },
    { id: 'messenger', label: 'Messenger' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'matrix', label: 'Matrix' },
  ];

  // Calculate counts per service
  const counts = conversations.reduce<Record<string, number>>((acc, c) => {
    acc[c.service] = (acc[c.service] || 0) + (c.unreadCount > 0 ? 1 : 0);
    return acc;
  }, {});

  const totalUnreadChats = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-2 p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1">
          {services.map((item) => {
            const isActive = serviceFilter === item.id;
            const unreadCount = item.id === 'all' ? totalUnreadChats : counts[item.id] || 0;
            const meta = item.id !== 'all' ? SERVICES_CONFIG[item.id as ServiceId] : null;

            return (
              <button
                key={item.id}
                onClick={() => setServiceFilter(item.id)}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                {meta && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: meta.brandColor }}
                  />
                )}
                <span>{item.label}</span>
                {unreadCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={`min-h-[36px] px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 border ${
            unreadOnly
              ? 'bg-teal-500 text-white border-teal-600'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:text-slate-700'
          }`}
          title="Toggle unread chats only"
        >
          Unread only
        </button>
      </div>
    </div>
  );
};
