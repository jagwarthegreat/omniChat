import React, { useState } from 'react';
import { X, CheckCircle2, RefreshCw, AlertCircle, Shield } from 'lucide-react';
import { useMessaging } from '../../../context/MessagingContext';

interface InstagramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstagramModal: React.FC<InstagramModalProps> = ({ isOpen, onClose }) => {
  const { updateBridgeStatus } = useMessaging();
  const [stage, setStage] = useState<'checkpoint' | 'credentials' | 'success'>('checkpoint');
  const [securityCode, setSecurityCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleResolveCheckpoint = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1100));
    setLoading(false);
    setStage('success');
    updateBridgeStatus('instagram', 'connected');
    setTimeout(() => {
      setStage('checkpoint');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-600 text-white font-bold flex items-center justify-center text-xs">
              IG
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Instagram Checkpoint Verification
              </h3>
              <p className="text-xs text-slate-500">mautrix-instagram session challenge</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {stage === 'checkpoint' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">Security Checkpoint Triggered</p>
                  <p>
                    Instagram detected a new bridge IP session for <strong>@alex_visuals</strong>. A 6-digit confirmation code was sent via SMS to your linked phone (+1 *** *** 2041).
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  6-Digit SMS Security Code
                </label>
                <input
                  type="text"
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value)}
                  placeholder="e.g. 592810"
                  maxLength={6}
                  className="w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-widest bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveCheckpoint}
                  disabled={loading || !securityCode}
                  className="flex-1 py-2 px-4 text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Resolve Checkpoint</span>}
                </button>
              </div>
            </div>
          )}

          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-pink-500 animate-in zoom-in-50 duration-200" />
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Instagram Bridge Re-authenticated!
              </h4>
              <p className="text-xs text-slate-500">
                Session verified. Direct messages and media sync have resumed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
