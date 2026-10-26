import React, { useState } from 'react';
import { X, Send, Lock, CheckCircle2, RefreshCw } from 'lucide-react';
import { useMessaging } from '../../../context/MessagingContext';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({ isOpen, onClose }) => {
  const { updateBridgeStatus } = useMessaging();
  const [step, setStep] = useState<'phone' | 'code' | '2fa' | 'success'>('phone');
  const [phone, setPhone] = useState('+1 (555) 302-8819');
  const [code, setCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendCode = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setStep('code');
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    // Move to 2FA if needed or straight to success
    if (code === '2fa') {
      setStep('2fa');
    } else {
      setStep('success');
      updateBridgeStatus('telegram', 'connected');
      setTimeout(() => {
        onClose();
        setStep('phone');
      }, 1200);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setStep('success');
    updateBridgeStatus('telegram', 'connected');
    setTimeout(() => {
      onClose();
      setStep('phone');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-white font-bold flex items-center justify-center text-xs">
              TG
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Link Telegram MTProto Bridge
              </h3>
              <p className="text-xs text-slate-500">mautrix-telegram bridge client</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {step === 'phone' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Enter your phone number. The mautrix-telegram bridge will issue a login command (`!tg login`) to send a verification code to your Telegram app.
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  International Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1..."
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-mono"
                />
              </div>

              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send Login Code</span>
              </button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                A 5-digit verification code was sent to your active Telegram session on {phone}.
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Telegram Login Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 84920"
                  maxLength={6}
                  className="w-full px-3 py-2.5 text-center text-lg font-mono font-bold tracking-widest bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  Type any 5 numbers (or "2fa" to test 2FA cloud password)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('phone')}
                  className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || !code}
                  className="flex-1 py-2 px-4 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify & Connect</span>}
                </button>
              </div>
            </div>
          )}

          {step === '2fa' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Lock className="w-5 h-5" />
                <h4 className="text-sm font-semibold">Two-Step Verification</h4>
              </div>
              <p className="text-xs text-slate-500">
                Your Telegram account is protected by an additional Cloud Password.
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Cloud Password
                </label>
                <input
                  type="password"
                  value={password2FA}
                  onChange={(e) => setPassword2FA(e.target.value)}
                  placeholder="Enter 2FA password"
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <button
                onClick={handleVerify2FA}
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Confirm Cloud Password</span>}
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-sky-500 animate-in zoom-in-50 duration-200" />
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Telegram MTProto Bridge Connected!
              </h4>
              <p className="text-xs text-slate-500">
                Synced conversations and channels are now routed into Matrix rooms.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
