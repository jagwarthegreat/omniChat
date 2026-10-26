import React, { useState } from 'react';
import { X, CheckCircle2, RefreshCw, KeyRound, Bot, QrCode } from 'lucide-react';
import { useMessaging } from '../../../context/MessagingContext';

interface DiscordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiscordModal: React.FC<DiscordModalProps> = ({ isOpen, onClose }) => {
  const { updateBridgeStatus } = useMessaging();
  const [authType, setAuthType] = useState<'bot' | 'user_token' | 'qr'>('user_token');
  const [token, setToken] = useState('OTk0ODI0OTI4MTk0ODI5MTAy.G_dev.token_hash');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSuccess(true);
    updateBridgeStatus('discord', 'connected');
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
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
              DC
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Link Discord Bridge
              </h3>
              <p className="text-xs text-slate-500">mautrix-discord gateway puppet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-indigo-500 animate-in zoom-in-50 duration-200" />
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Discord Bridge Connected!
              </h4>
              <p className="text-xs text-slate-500">
                Guild channels and DMs mapped to Matrix room spaces.
              </p>
            </div>
          ) : (
            <>
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {[
                  { id: 'user_token' as const, label: 'User Token', icon: KeyRound },
                  { id: 'bot' as const, label: 'Bot Client', icon: Bot },
                  { id: 'qr' as const, label: 'Mobile QR', icon: QrCode },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAuthType(item.id)}
                    className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                      authType === item.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {authType === 'user_token' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Provides full puppet direct messaging and guild room mirroring using your Discord gateway session.
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Gateway Auth Token
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Discord token..."
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tokens are retained exclusively in your local homeserver application-service database.
                  </p>
                </div>
              )}

              {authType === 'bot' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Invite a custom Discord Application Bot to your Discord server for relay messaging.
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Discord Bot Secret
                    </label>
                    <input
                      type="password"
                      placeholder="Bot token from Discord Developer Portal..."
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                </div>
              )}

              {authType === 'qr' && (
                <div className="flex flex-col items-center space-y-3 py-2">
                  <div className="w-36 h-36 border-2 border-indigo-400/40 rounded-2xl flex items-center justify-center bg-indigo-50/50 dark:bg-indigo-950/20">
                    <QrCode className="w-24 h-24 text-indigo-500" />
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Scan using Discord Mobile app &gt; User Settings &gt; Scan QR Code
                  </p>
                </div>
              )}
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
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Connect Discord</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
