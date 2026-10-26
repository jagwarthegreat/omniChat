import React from 'react';
import { ShieldCheck, ShieldAlert, X, Info, Lock } from 'lucide-react';
import { ServiceId } from '../../types';
import { SERVICES_CONFIG } from '../../config/services';

interface TrustBoundaryModalProps {
  service: ServiceId;
  isOpen: boolean;
  onClose: () => void;
}

export const TrustBoundaryModal: React.FC<TrustBoundaryModalProps> = ({
  service,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const isNativeMatrix = service === 'matrix';
  const meta = SERVICES_CONFIG[service];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-boundary-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isNativeMatrix
                  ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isNativeMatrix ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="trust-boundary-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isNativeMatrix ? 'End-to-End Encryption (E2EE)' : `${meta.name} Bridge Trust Boundary`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Architecture and cryptographic disclosure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {isNativeMatrix ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-900 dark:text-teal-200 space-y-1">
                  <p className="font-semibold">True Zero-Knowledge End-to-End Encryption</p>
                  <p>
                    Messages in this room are encrypted on your local device using the Megolm ratchet. The homeserver and network relays only see encrypted ciphertext.
                  </p>
                </div>
              </div>
              <ul className="text-xs space-y-2 list-disc list-inside text-slate-600 dark:text-slate-400">
                <li>Keys are stored locally in secure client storage (`IndexedDB` / SQLite).</li>
                <li>Device cross-signing verifies cryptographic identities across app restarts.</li>
                <li>No intermediate bridge decrypts this timeline.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-semibold">Bridge Architecture & Trust Boundary Notice</p>
                  <p>
                    Bridged conversations connect through <strong>{meta.bridgePackage}</strong>. To translate Matrix protocol events to {meta.name}, the bridge worker service must decrypt the message before transmitting it to the {meta.name} network.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Data Flow Topology:
                </p>
                <div className="text-xs font-mono p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  OmniChat App ──[E2EE / TLS]──&gt; Synapse ──[Appservice IPC]──&gt; {meta.bridgePackage} ──&gt; {meta.name} API
                </div>
              </div>

              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <p>
                  <strong>Security Guarantee:</strong> The bridge runs within your private self-hosted or dedicated infrastructure. No third-party analytics or external telemetry services have access to your chat payloads.
                </p>
                <p>
                  <strong>Platform Compliance:</strong> WhatsApp, Telegram, Messenger, Instagram, and Discord operate under their respective platform protocols. The bridge client acts as your linked device session.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
