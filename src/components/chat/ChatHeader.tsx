import React, { useState } from 'react';
import { ChevronLeft, PhoneOff, VideoOff, Info, Lock, ShieldAlert, Search } from 'lucide-react';
import { ConversationSummary } from '../../types';
import { ServiceBadge } from '../common/ServiceBadge';
import { TrustBoundaryModal } from '../common/TrustBoundaryModal';

interface ChatHeaderProps {
  conversation: ConversationSummary;
  isTyping: boolean;
  onBack: () => void;
  onToggleInfo: () => void;
  onToggleSearch: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  isTyping,
  onBack,
  onToggleInfo,
  onToggleSearch,
}) => {
  const [showTrustModal, setShowTrustModal] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg"
            aria-label="Back to inbox"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Avatar with Service Badge */}
          <div className="relative shrink-0">
            {conversation.avatarUrl ? (
              <img
                src={conversation.avatarUrl}
                alt={conversation.title}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-sm">
                {conversation.title.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 ring-2 ring-white dark:ring-slate-900 rounded-md">
              <ServiceBadge service={conversation.service} size="xs" />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {conversation.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {isTyping ? (
                <span className="text-teal-600 dark:text-teal-400 font-medium animate-pulse">
                  typing...
                </span>
              ) : conversation.isGroup ? (
                <span>{(conversation.participants?.length || 0)} members</span>
              ) : (
                <span>
                  {conversation.participants?.[0]?.isOnline ? 'Online' : 'Offline'}
                </span>
              )}

              <span aria-hidden="true">·</span>

              {/* Trust Badge Button */}
              <button
                onClick={() => setShowTrustModal(true)}
                className="hover:underline flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400"
              >
                {conversation.isEncrypted ? (
                  <>
                    <Lock className="w-3 h-3 text-teal-500" />
                    <span>E2EE</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                    <span>Bridged Relay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleSearch}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Search in this conversation"
            aria-label="Search conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Disabled Calls Button (honest bridge constraint) */}
          <div className="relative group">
            <button
              disabled
              className="p-2 text-slate-300 dark:text-slate-600 cursor-not-allowed rounded-xl"
              title="Voice/video calls are unsupported across bridges"
              aria-label="Calls unsupported"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onToggleInfo}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Conversation Details & Bridge Info"
            aria-label="Conversation details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      <TrustBoundaryModal
        service={conversation.service}
        isOpen={showTrustModal}
        onClose={() => setShowTrustModal(false)}
      />
    </>
  );
};
