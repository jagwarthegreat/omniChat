import React, { useState } from 'react';
import { X, Plus, MessageSquare } from 'lucide-react';
import { useMessaging } from '../../context/MessagingContext';
import { ServiceId } from '../../types';
import { SERVICES_CONFIG } from '../../config/services';
import { ServiceBadge } from '../common/ServiceBadge';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { conversations, setActiveRoomId, sendMessage } = useMessaging();
  const [selectedService, setSelectedService] = useState<ServiceId>('whatsapp');
  const [contactName, setContactName] = useState('');
  const [contactHandle, setContactHandle] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  if (!isOpen) return null;

  const handleStartChat = () => {
    if (!contactName.trim()) return;

    // Check if room with this participant or title already exists
    const existing = conversations.find(
      (c) =>
        c.service === selectedService &&
        c.title.toLowerCase() === contactName.trim().toLowerCase()
    );

    if (existing) {
      setActiveRoomId(existing.roomId);
      if (initialMessage.trim()) {
        sendMessage({ content: initialMessage.trim() });
      }
    } else {
      // Pick first matching room of that service or navigate to it
      const match = conversations.find((c) => c.service === selectedService);
      if (match) {
        setActiveRoomId(match.roomId);
        if (initialMessage.trim()) {
          sendMessage({ content: initialMessage.trim() });
        }
      }
    }

    onClose();
    setContactName('');
    setContactHandle('');
    setInitialMessage('');
  };

  const services: ServiceId[] = [
    'whatsapp',
    'telegram',
    'discord',
    'messenger',
    'instagram',
    'matrix',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Start Bridged Conversation
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {/* Service Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Select Messaging Network
            </label>
            <div className="grid grid-cols-3 gap-2">
              {services.map((srv) => {
                const meta = SERVICES_CONFIG[srv];
                const isSelected = selectedService === srv;
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-500/10 text-slate-900 dark:text-white font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <ServiceBadge service={srv} size="xs" />
                    <span className="text-xs truncate">{meta.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Contact / Channel Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Liam Foster or #announcements"
              className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-slate-100"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Phone / Username Handle (Optional)
            </label>
            <input
              type="text"
              value={contactHandle}
              onChange={(e) => setContactHandle(e.target.value)}
              placeholder="e.g. +1 555-0192 or @liam_dev"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Initial Message
            </label>
            <textarea
              rows={2}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Type your opening message..."
              className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleStartChat}
            disabled={!contactName.trim()}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open Conversation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
