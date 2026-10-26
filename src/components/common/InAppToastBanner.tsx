import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { InAppToast, useMessaging } from '../../context/MessagingContext';
import { ServiceBadge } from './ServiceBadge';

export const InAppToastBanner: React.FC = () => {
  const { inAppToast, clearInAppToast, setActiveRoomId, setActiveTab } = useMessaging();

  if (!inAppToast) return null;

  const handleClick = () => {
    setActiveRoomId(inAppToast.roomId);
    setActiveTab('inbox');
    clearInAppToast();
  };

  return (
    <div className="fixed top-16 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-3 fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 flex items-start gap-3">
        <ServiceBadge service={inAppToast.service} size="sm" className="mt-0.5" />

        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {inAppToast.title}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
            {inAppToast.body}
          </p>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 mt-1">
            <span>Tap to open conversation</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        <button
          onClick={clearInAppToast}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
