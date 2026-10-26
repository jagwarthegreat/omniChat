import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  CornerUpLeft,
  Copy,
  Trash2,
  Edit2,
  FileText,
  Play,
  Pause,
  Smile,
} from 'lucide-react';
import { Message, ReplyContext, BridgeCapabilities } from '../../types';

interface MessageBubbleProps {
  message: Message;
  capabilities: BridgeCapabilities;
  onReply: (ctx: ReplyContext) => void;
  onToggleReaction: (emoji: string) => void;
  onDelete: () => void;
  onEdit: (newText: string) => void;
  onRetry: () => void;
  onImageClick?: (url: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🚀', '✅'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  capabilities,
  onReply,
  onToggleReaction,
  onDelete,
  onEdit,
  onRetry,
  onImageClick,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatTimestamp = (ts: number) => {
    if (!ts || isNaN(ts)) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.content) {
      onEdit(editText.trim());
    }
    setIsEditing(false);
  };

  const renderStatusIcon = () => {
    if (!message.isSelf) return null;

    switch (message.status) {
      case 'queued':
        return (
          <span title="Queued in offline outbox">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </span>
        );
      case 'sending':
        return (
          <span title="Sending...">
            <Check className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
          </span>
        );
      case 'sent':
        return (
          <span title="Sent to homeserver">
            <Check className="w-3.5 h-3.5 text-slate-400" />
          </span>
        );
      case 'delivered':
        return (
          <span title="Delivered to network">
            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
          </span>
        );
      case 'read':
        return (
          <span title="Read by recipient">
            <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
          </span>
        );
      case 'failed':
        return (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-[11px] text-red-500 hover:underline"
            title="Message send failed. Click to retry."
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`group flex flex-col mb-3 ${
        message.isSelf ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender name for incoming group messages */}
      {!message.isSelf && (
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-3 mb-1">
          {message.senderName}
        </span>
      )}

      {/* Main bubble container with action buttons on hover */}
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Hover / Long-press action toolbar */}
        <div
          className={`absolute -top-7 ${
            message.isSelf ? 'right-0' : 'left-0'
          } hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg px-1.5 py-0.5 z-10`}
        >
          {capabilities.reactions && (
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
              title="Add reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          )}

          {capabilities.replies && (
            <button
              onClick={() =>
                onReply({
                  messageId: message.id,
                  senderName: message.senderName,
                  content: message.content || (message.attachment ? `[${message.attachment.type}]` : ''),
                })
              }
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
              title="Reply"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
            title={copied ? 'Copied!' : 'Copy'}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {message.isSelf && capabilities.edits && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
              title="Edit message"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {message.isSelf && capabilities.deleteMessage && (
            <button
              onClick={onDelete}
              className="p-1 text-red-500 hover:text-red-700 rounded"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Floating Quick Emoji Picker */}
        {showEmojiPicker && (
          <div
            className={`absolute -top-12 ${
              message.isSelf ? 'right-0' : 'left-0'
            } flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-full px-2 py-1 z-20 animate-in fade-in zoom-in-95 duration-100`}
          >
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onToggleReaction(emoji);
                  setShowEmojiPicker(false);
                }}
                className="hover:scale-125 transition-transform p-1 text-base leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Bubble Surface */}
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
            message.isSelf
              ? 'bg-slate-900 dark:bg-teal-700 text-white rounded-tr-none'
              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none'
          }`}
        >
          {/* Quoted Reply Preview */}
          {message.replyTo && (
            <div
              className={`mb-2 pl-2.5 py-1 text-xs border-l-2 rounded-r ${
                message.isSelf
                  ? 'border-white/50 bg-white/10 text-white/90'
                  : 'border-teal-500 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="font-semibold block truncate">
                {message.replyTo.senderName}
              </span>
              <p className="truncate opacity-80">{message.replyTo.content}</p>
            </div>
          )}

          {/* Attachment Preview */}
          {message.attachment && (
            <div className="mb-2">
              {message.attachment.type === 'image' && (
                <div className="overflow-hidden rounded-xl cursor-pointer">
                  <img
                    src={message.attachment.url}
                    alt={message.attachment.name}
                    referrerPolicy="no-referrer"
                    onClick={() => onImageClick?.(message.attachment?.url || '')}
                    className="max-h-64 w-full object-cover rounded-xl hover:opacity-95 transition-opacity"
                  />
                </div>
              )}

              {message.attachment.type === 'file' && (
                <div
                  className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                    message.isSelf
                      ? 'bg-white/10 border-white/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <FileText className="w-6 h-6 shrink-0 opacity-80" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs truncate">
                      {message.attachment.name}
                    </p>
                    <p className="text-[10px] opacity-70 font-mono tabular-nums">
                      {(message.attachment.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              )}

              {message.attachment.type === 'audio' && (
                <div
                  className={`flex items-center gap-3 p-2.5 rounded-xl border min-w-[200px] ${
                    message.isSelf
                      ? 'bg-white/10 border-white/20'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0"
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1 h-3">
                      {[40, 70, 90, 60, 30, 80, 100, 50, 60, 40].map((h, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full ${
                            isPlayingAudio ? 'bg-teal-400 animate-pulse' : 'bg-slate-400'
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono tabular-nums opacity-75">
                      0:24 voice note
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message Content / Inline Edit Form */}
          {isEditing ? (
            <div className="space-y-2 py-1">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-2.5 py-1 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-700 outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-1.5 text-xs">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 rounded opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2.5 py-0.5 rounded bg-teal-500 text-white font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="break-words leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          )}

          {/* Footer: timestamp, edited status, delivery state */}
          <div
            className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] font-mono tabular-nums ${
              message.isSelf ? 'text-white/70' : 'text-slate-400'
            }`}
          >
            {message.edited && <span className="italic opacity-80">(edited)</span>}
            <span>{formatTimestamp(message.timestamp)}</span>
            {renderStatusIcon()}
          </div>
        </div>

        {/* Reaction Badges */}
        {((message.reactions?.length) || 0) > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${
              message.isSelf ? 'justify-end' : 'justify-start'
            }`}
          >
            {(message.reactions || []).map((reaction) => (
              <button
                key={reaction.key}
                onClick={() => onToggleReaction(reaction.key)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${
                  reaction.hasReacted
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <span>{reaction.key}</span>
                <span className="font-mono tabular-nums text-[10px]">
                  {reaction.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
