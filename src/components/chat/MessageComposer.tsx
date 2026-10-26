import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  FileText,
  X,
  Square,
  Sparkles,
} from 'lucide-react';
import { ReplyContext, Attachment, BridgeCapabilities } from '../../types';

interface MessageComposerProps {
  capabilities: BridgeCapabilities;
  replyTo?: ReplyContext;
  onClearReply: () => void;
  onSend: (payload: { content: string; replyTo?: ReplyContext; attachment?: Attachment }) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  capabilities,
  replyTo,
  onClearReply,
  onSend,
}) => {
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() && !pendingAttachment) return;
    onSend({
      content: text,
      replyTo,
      attachment: pendingAttachment,
    });
    setText('');
    setPendingAttachment(undefined);
    onClearReply();
    setShowAttachMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSimulatePhotoAttachment = () => {
    const samplePhotos = [
      {
        url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
        name: 'architecture_design_review.jpg',
      },
      {
        url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
        name: 'client_code_diff.png',
      },
    ];
    const picked = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
    setPendingAttachment({
      id: `att-${Date.now()}`,
      type: 'image',
      url: picked.url,
      name: picked.name,
      sizeBytes: 1850000,
      mimeType: 'image/jpeg',
    });
    setShowAttachMenu(false);
  };

  const handleSimulateFileAttachment = () => {
    setPendingAttachment({
      id: `att-${Date.now()}`,
      type: 'file',
      url: '#',
      name: 'mautrix-bridge-spec.pdf',
      sizeBytes: 4200000,
      mimeType: 'application/pdf',
    });
    setShowAttachMenu(false);
  };

  const handleFinishVoiceRecord = () => {
    setIsRecordingVoice(false);
    setPendingAttachment({
      id: `att-voice-${Date.now()}`,
      type: 'audio',
      url: '#',
      name: `voice_note_${recordingSeconds}s.ogg`,
      sizeBytes: 32000 * Math.max(1, recordingSeconds),
      mimeType: 'audio/ogg',
      durationSeconds: recordingSeconds || 1,
    });
  };

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      {/* Reply Banner */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              Replying to {replyTo.senderName}:
            </span>
            <span className="truncate opacity-80">{replyTo.content}</span>
          </div>
          <button
            onClick={onClearReply}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Attachment Preview */}
      {pendingAttachment && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex items-center gap-2">
            {pendingAttachment.type === 'image' && <ImageIcon className="w-4 h-4 text-teal-500" />}
            {pendingAttachment.type === 'file' && <FileText className="w-4 h-4 text-blue-500" />}
            {pendingAttachment.type === 'audio' && <Mic className="w-4 h-4 text-amber-500" />}
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
              {pendingAttachment.name}
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              {(pendingAttachment.sizeBytes / 1024).toFixed(0)} KB
            </span>
          </div>
          <button
            onClick={() => setPendingAttachment(undefined)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recording Active Bar */}
      {isRecordingVoice ? (
        <div className="flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              Recording Voice Note:
            </span>
            <span className="text-xs font-mono font-bold text-red-700 dark:text-red-300 tabular-nums">
              0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecordingVoice(false)}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleFinishVoiceRecord}
              className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2 relative">
          {/* Attachment Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={!capabilities.sendMedia}
              title={
                capabilities.sendMedia
                  ? 'Attach photo, file, or media'
                  : 'Media attachments unsupported by this bridge'
              }
              className={`p-2.5 rounded-xl transition-colors ${
                capabilities.sendMedia
                  ? 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
              }`}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Attachment Dropdown Menu */}
            {showAttachMenu && (
              <div className="absolute bottom-12 left-0 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={handleSimulatePhotoAttachment}
                  className="w-full px-3.5 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span>Photo / Image</span>
                </button>
                <button
                  onClick={handleSimulateFileAttachment}
                  className="w-full px-3.5 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Document / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Multiline Textarea Input */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-transparent focus-within:border-teal-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all flex items-center px-3.5 py-1.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Write a message... (Enter to send)"
              className="w-full bg-transparent resize-none outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 py-1 max-h-32"
            />
          </div>

          {/* Voice note recorder button (if supported by bridge) */}
          {capabilities.voiceNotes && !text.trim() && !pendingAttachment && (
            <button
              onClick={() => setIsRecordingVoice(true)}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!text.trim() && !pendingAttachment}
            className={`p-2.5 rounded-xl transition-all ${
              text.trim() || pendingAttachment
                ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-md hover:scale-105 active:scale-95'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
