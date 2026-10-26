import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown, X } from 'lucide-react';
import { Message, ReplyContext, BridgeCapabilities } from '../../types';
import { MessageBubble } from './MessageBubble';

interface MessageTimelineProps {
  messages: Message[];
  capabilities: BridgeCapabilities;
  isTyping: boolean;
  searchFilter?: string;
  onReply: (ctx: ReplyContext) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onRetryMessage: (messageId: string) => void;
}

export const MessageTimeline: React.FC<MessageTimelineProps> = ({
  messages,
  capabilities,
  isTyping,
  searchFilter = '',
  onReply,
  onToggleReaction,
  onDeleteMessage,
  onEditMessage,
  onRetryMessage,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 180);
  };

  // Group messages by day
  const formatDateHeader = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredMessages = searchFilter
    ? messages.filter((m) => m.content.toLowerCase().includes(searchFilter.toLowerCase()))
    : messages;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative bg-slate-50/50 dark:bg-slate-950/40"
    >
      {filteredMessages.map((msg, index) => {
        const prevMsg = filteredMessages[index - 1];
        const isNewDay =
          !prevMsg ||
          new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

        return (
          <React.Fragment key={msg.id}>
            {isNewDay && (
              <div className="flex items-center justify-center my-4">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 px-3 py-1 rounded-full shadow-2xs select-none">
                  {formatDateHeader(msg.timestamp)}
                </span>
              </div>
            )}

            <MessageBubble
              message={msg}
              capabilities={capabilities}
              onReply={onReply}
              onToggleReaction={(emoji) => onToggleReaction(msg.id, emoji)}
              onDelete={() => onDeleteMessage(msg.id)}
              onEdit={(newText) => onEditMessage(msg.id, newText)}
              onRetry={() => onRetryMessage(msg.id)}
              onImageClick={(url) => setLightboxImage(url)}
            />
          </React.Fragment>
        );
      })}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 w-fit text-xs text-slate-500 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
          <span className="ml-1 text-[11px] font-medium">Contact is typing</span>
        </div>
      )}

      <div ref={bottomRef} />

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-6 p-2.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg hover:scale-105 transition-transform z-20"
          title="Scroll to latest message"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Media attachment preview"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
