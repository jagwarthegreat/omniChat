import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  QrCode,
  Smartphone,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Copy,
  LogOut,
  Sparkles,
  Database,
} from 'lucide-react';
import { useMessaging } from '../../../context/MessagingContext';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose }) => {
  const { updateBridgeStatus, bridges, restoreWhatsAppSession } = useMessaging();
  const [method, setMethod] = useState<'qr' | 'code'>('code'); // Default to code as user preferred
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(25);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omnichat_wa_phone') || '+639945864387';
    }
    return '+639945864387';
  });
  const [pairingCode, setPairingCode] = useState<string>('');
  const [loadingPairCode, setLoadingPairCode] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const waBridge = bridges.find((b) => b.id === 'whatsapp');
  const isAlreadyConnected = waBridge?.connectionState === 'connected';

  // Save phone number to storage
  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    localStorage.setItem('omnichat_wa_phone', val);
  };

  // Fetch live QR code from backend Baileys socket
  const fetchQrCode = useCallback(async () => {
    try {
      setLoadingQr(true);
      setErrorMsg(null);
      const res = await fetch('/api/whatsapp/qr');
      if (!res.ok) throw new Error('Failed to generate live pairing ticket');
      const data = await res.json();
      if (data.success && data.qrDataUrl) {
        setQrDataUrl(data.qrDataUrl);
        setCountdown(data.expiresInSeconds || 20);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating QR code';
      setErrorMsg(msg);
    } finally {
      setLoadingQr(false);
    }
  }, []);

  const handleRefreshQr = useCallback(async () => {
    try {
      setLoadingQr(true);
      await fetch('/api/whatsapp/qr/refresh', { method: 'POST' });
      await new Promise((r) => setTimeout(r, 600));
      await fetchQrCode();
    } catch {
      fetchQrCode();
    } finally {
      setLoadingQr(false);
    }
  }, [fetchQrCode]);

  // Request authentic phone pairing code from WhatsApp servers via Baileys
  const handleRequestPairCode = async () => {
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 8) {
      setErrorMsg('Please enter a valid international phone number (e.g. +639945864387)');
      return;
    }

    try {
      setLoadingPairCode(true);
      setErrorMsg(null);
      const res = await fetch('/api/whatsapp/pair-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanDigits }),
      });
      const data = await res.json();
      if (data.success && data.pairingCode) {
        setPairingCode(data.pairingCode);
      } else {
        throw new Error(data.error || 'Failed to request pairing code from WhatsApp');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error requesting code';
      setErrorMsg(msg);
    } finally {
      setLoadingPairCode(false);
    }
  };

  // Confirm connection / simulate successful handshake
  const handleVerifySession = async () => {
    try {
      setIsVerifying(true);
      setErrorMsg(null);
      const res = await fetch('/api/whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          name: 'Alex Rivera (WA)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        updateBridgeStatus('whatsapp', 'connected');
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1400);
      } else {
        throw new Error(data.error || 'Failed to verify session');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error verifying connection';
      setErrorMsg(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Disconnect session
  const handleDisconnect = async () => {
    try {
      setIsVerifying(true);
      await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      updateBridgeStatus('whatsapp', 'disconnected');
      setPairingCode('');
      fetchQrCode();
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Poll for connection status while pairing code is displayed
  useEffect(() => {
    if (!isOpen || success || isAlreadyConnected) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        if (res.ok) {
          const data = await res.json();
          if (data.connectionState === 'connected') {
            updateBridgeStatus('whatsapp', 'connected');
            setSuccess(true);
            setTimeout(() => {
              setSuccess(false);
              onClose();
            }, 1400);
          }
        }
      } catch {
        // Ignore poll error
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, success, isAlreadyConnected, updateBridgeStatus, onClose]);

  // Fetch QR on open or timer
  useEffect(() => {
    if (isOpen && method === 'qr' && !success) {
      fetchQrCode();
    }
  }, [isOpen, method, success, fetchQrCode]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isOpen && method === 'qr' && !success && qrDataUrl) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            fetchQrCode();
            return 20;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, method, success, qrDataUrl, fetchQrCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold flex items-center justify-center text-xs">
              WA
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Link WhatsApp Bridge
              </h3>
              <p className="text-xs text-slate-500">Live multi-device companion connection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-in zoom-in-50 duration-200" />
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                WhatsApp Linked Successfully!
              </h4>
              <p className="text-xs text-slate-500">
                Live multi-device session verified. Your chats are synced with OmniChat.
              </p>
            </div>
          ) : (
            <>
              {/* Account Safety Advisory */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Live Multi-Device Session:</strong> Connects via WhatsApp Web protocol. Pairing codes are generated directly from Meta's WhatsApp servers.
                </p>
              </div>

              {/* Already Connected Banner with Unlink option */}
              {isAlreadyConnected && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                      Active Connection
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Linked to {phoneNumber}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={isVerifying}
                    className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/60 transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Unlink</span>
                  </button>
                </div>
              )}

              {/* Local Backup Available Quick-Restore Banner */}
              {typeof window !== 'undefined' &&
                localStorage.getItem('omnichat_whatsapp_session_backup') &&
                !isAlreadyConnected && (
                  <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 block">
                          Saved Session Backup Found
                        </span>
                        <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                          SQLite & browser backup available for {phoneNumber}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        setIsRestoring(true);
                        setErrorMsg(null);
                        try {
                          const success = await restoreWhatsAppSession();
                          if (success) {
                            setSuccess(true);
                            setTimeout(() => {
                              setSuccess(false);
                              onClose();
                            }, 1400);
                          } else {
                            setErrorMsg('Could not restore session keys from backup. Please scan QR or request pairing code.');
                          }
                        } finally {
                          setIsRestoring(false);
                        }
                      }}
                      disabled={isRestoring}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-70"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Restoring...</span>
                        </>
                      ) : (
                        <span>Restore Now</span>
                      )}
                    </button>
                  </div>
                )}

              {/* Method Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  onClick={() => {
                    setMethod('code');
                    if (!pairingCode) handleRequestPairCode();
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    method === 'code'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Phone Pairing Code</span>
                </button>

                <button
                  onClick={() => setMethod('qr')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    method === 'qr'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scannable QR Code</span>
                </button>
              </div>

              {method === 'code' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Your WhatsApp Phone Number (with Country Code)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="+639945864387"
                        className="flex-1 px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-slate-100"
                      />
                      <button
                        onClick={handleRequestPairCode}
                        disabled={loadingPairCode || !phoneNumber}
                        className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                      >
                        {loadingPairCode ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Requesting...</span>
                          </>
                        ) : (
                          <span>Get Official Code</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {pairingCode ? (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border-2 border-emerald-500/40 text-center space-y-2 animate-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Official WhatsApp Pairing Code</span>
                      </div>

                      <div className="flex items-center justify-center gap-2 py-1">
                        <span className="text-2xl font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 select-all">
                          {pairingCode}
                        </span>
                        <button
                          onClick={() => {
                            // Copy without dash or with dash
                            navigator.clipboard.writeText(pairingCode.replace('-', ''));
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 1500);
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                          title="Copy pairing code"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      {copiedCode && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                          Copied to clipboard!
                        </span>
                      )}

                      <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-lg text-left text-xs space-y-1 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          Step-by-step on your phone:
                        </p>
                        <p>1. Open WhatsApp on your mobile phone</p>
                        <p>2. Tap <strong>Settings</strong> (or three dots) &gt; <strong>Linked Devices</strong></p>
                        <p>3. Tap <strong>Link a Device</strong></p>
                        <p>4. Tap <strong>"Link with phone number instead"</strong> at the bottom</p>
                        <p>5. Enter the code <strong className="font-mono text-emerald-600 dark:text-emerald-400">{pairingCode}</strong></p>
                      </div>

                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 pt-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                        <span>Waiting for phone confirmation...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                      <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Click "Get Official Code" above to generate a verified 8-digit WhatsApp Companion pairing code.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        The code is registered directly with Meta WhatsApp servers for your phone number.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  {/* Real Scannable QR Code Container */}
                  <div className="relative p-4 bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
                    {loadingQr ? (
                      <div className="w-56 h-56 flex flex-col items-center justify-center space-y-2 text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                        <span className="text-xs">Generating live pairing ticket...</span>
                      </div>
                    ) : qrDataUrl ? (
                      <div className="relative">
                        <img
                          src={qrDataUrl}
                          alt="Real Scannable WhatsApp QR Code"
                          className="w-56 h-56 object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-white/90 p-1 shadow-md">
                            <div className="w-full h-full rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">
                              WA
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400">
                        <button
                          onClick={handleRefreshQr}
                          className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg"
                        >
                          Generate QR Code
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-slate-500">
                      <button
                        onClick={handleRefreshQr}
                        className="hover:text-emerald-600 flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingQr ? 'animate-spin' : ''}`} />
                        <span>Refresh Code</span>
                      </button>
                      <span>·</span>
                      <span>Expires in {countdown}s</span>
                    </div>
                  </div>

                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      How to link with your phone camera:
                    </p>
                    <p>1. Open WhatsApp on your mobile phone</p>
                    <p>2. Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong></p>
                    <p>3. Tap <strong>Link a Device</strong> and point your camera at this QR code</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Close
            </button>

            <button
              onClick={handleVerifySession}
              disabled={isVerifying}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Confirm Link & Connect</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
