import React, { useState } from 'react';
import { X, CheckCircle2, RefreshCw, Cookie, Shield } from 'lucide-react';
import { useMessaging } from '../../../context/MessagingContext';

interface MessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MessengerModal: React.FC<MessengerModalProps> = ({ isOpen, onClose }) => {
  const { updateBridgeStatus } = useMessaging();
  const [cookieData, setCookieData] = useState('c_user=10002938192; xs=42%3Ad7b89...;');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSuccess(true);
    updateBridgeStatus('messenger', 'connected');
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              MS
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Link Messenger Bridge
              </h3>
              <p className="text-xs text-slate-500">mautrix-meta Graph/MQTT bridge</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-blue-500 animate-in zoom-in-50 duration-200" />
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Messenger Bridge Active!
              </h4>
              <p className="text-xs text-slate-500">
                Facebook Messenger threads synced to Matrix rooms.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Authenticate the bridge using your Meta web session string or browser cookies (`c_user` and `xs`).
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Meta Session Cookies
                </label>
                <textarea
                  rows={3}
                  value={cookieData}
                  onChange={(e) => setCookieData(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2">
                <Cookie className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-900 dark:text-blue-200">
                  Cookies are stored on your private homeserver appservice. Meta sessions expire after 30 to 60 days.
                </p>
              </div>
            </>
          )}
        </div>

        {!success && (
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={loading || !cookieData}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Connect Messenger</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
