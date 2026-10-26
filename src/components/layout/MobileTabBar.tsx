import React from 'react';
import { MessageSquare, Link2, SlidersHorizontal, Settings, Search } from 'lucide-react';
import { useMessaging } from '../../context/MessagingContext';

export const MobileTabBar: React.FC = () => {
  const { activeTab, setActiveTab, conversations } = useMessaging();
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  const tabs = [
    { id: 'inbox' as const, label: 'Inbox', icon: MessageSquare, badge: totalUnread },
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'bridges' as const, label: 'Bridges', icon: Link2 },
    { id: 'matrix' as const, label: 'Matrix & Caps', icon: SlidersHorizontal },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 transition-colors relative ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[16px] h-4 bg-teal-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] tracking-tight mt-1 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
