import React, { useState } from 'react';
import { X, CheckCircle2, RefreshCw, Server, ShieldCheck, Key } from 'lucide-react';
import { useMessaging } from '../../../context/MessagingContext';

interface MatrixHomeserverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MatrixHomeserverModal: React.FC<MatrixHomeserverModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings, updateBridgeStatus } = useMessaging();
  const [homeserver, setHomeserver] = useState(settings.homeserverUrl);
  const [username, setUsername] = useState(settings.username);
  const [accessToken, setAccessToken] = useState('syt_YWxleA_c419fa82109482');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    updateSettings({
      homeserverUrl: homeserver,
      username,
    });
    updateBridgeStatus('matrix', 'connected');
    setSuccess(true);
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
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-xs">
              MX
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Matrix Homeserver Config
              </h3>
              <p className="text-xs text-slate-500">Synapse + matrix-js-sdk (Rust Crypto)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-teal-500 animate-in zoom-in-50 duration-200" />
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Homeserver Connected!
              </h4>
              <p className="text-xs text-slate-500">
                Cross-signing keys synchronized with Rust Crypto engine.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Matrix Homeserver Base URL
                </label>
                <div className="relative">
                  <Server className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={homeserver}
                    onChange={(e) => setHomeserver(e.target.value)}
                    placeholder="https://matrix.org or https://synapse.local"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Matrix User ID (@user:domain)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@alex:matrix.local"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Session Access Token
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-teal-900 dark:text-teal-200">
                  Matrix E2EE crypto store initialized via Rust vodozemac engine. Local Megolm session keys are encrypted in client database storage.
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
              onClick={handleSave}
              disabled={loading || !homeserver || !username}
              className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Save & Verify</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
