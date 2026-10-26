import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Info,
  Database,
} from 'lucide-react';
import { BridgeInfo, ServiceId } from '../../types';
import { ServiceBadge } from '../common/ServiceBadge';
import { SERVICES_CONFIG } from '../../config/services';
import { useMessaging } from '../../context/MessagingContext';

interface BridgeCardProps {
  bridge: BridgeInfo;
  onRelink: (serviceId: ServiceId) => void;
  onReconnect: (serviceId: ServiceId) => void;
}

export const BridgeCard: React.FC<BridgeCardProps> = ({ bridge, onRelink, onReconnect }) => {
  const [expanded, setExpanded] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { restoreWhatsAppSession } = useMessaging();
  const meta = SERVICES_CONFIG[bridge.id];

  const handleReconnect = async () => {
    setReconnecting(true);
    await onReconnect(bridge.id);
    setReconnecting(false);
  };

  const handleRelink = async () => {
    if (bridge.id === 'whatsapp' && bridge.connectionState === 'needs_auth') {
      setIsRestoring(true);
      try {
        const success = await restoreWhatsAppSession();
        if (success) {
          setIsRestoring(false);
          return;
        }
      } catch (e) {
        console.warn('Auto restore attempt failed:', e);
      } finally {
        setIsRestoring(false);
      }
    }
    onRelink(bridge.id);
  };

  const getStatusBadge = () => {
    switch (bridge.connectionState) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Connecting
          </span>
        );
      case 'needs_auth':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Re-auth
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-md">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <ServiceBadge service={bridge.id} size="md" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{bridge.name}</span>
            </h3>
            <p className="text-xs font-mono text-slate-500">
              {bridge.packageName} <span className="text-slate-400">{bridge.version}</span>
            </p>
          </div>
        </div>

        {getStatusBadge()}
      </div>

      {/* Account Info & Error Banner */}
      {bridge.accountIdentifier && (
        <div className="text-xs text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
          <span className="text-slate-400">Linked Account:</span>
          <span className="font-semibold">{bridge.accountIdentifier}</span>
        </div>
      )}

      {bridge.errorDetail && (
        <div className="p-3 mb-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{bridge.errorDetail}</span>
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 text-center">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Uptime</span>
          <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
            {bridge.uptimeHours}h
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Events</span>
          <span className="text-xs font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
            {bridge.eventsProcessed.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Last Sync</span>
          <span className="text-xs font-mono text-slate-800 dark:text-slate-200">
            {Math.round((Date.now() - bridge.lastSyncAt) / 1000)}s ago
          </span>
        </div>
      </div>

      {/* Dual Persistence Indicator for WhatsApp */}
      {bridge.id === 'whatsapp' && (
        <div className="mb-4 px-3 py-2 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/15 dark:border-emerald-800/40 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>SQLite & LocalStorage</span>
          </span>
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            Dual Persistence Active
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRelink}
            disabled={isRestoring}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors flex items-center gap-1.5 disabled:opacity-75"
          >
            {isRestoring && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {isRestoring
                ? 'Restoring Session...'
                : bridge.connectionState === 'needs_auth'
                ? 'Re-authenticate'
                : 'Relink / Auth'}
            </span>
          </button>

          <button
            onClick={handleReconnect}
            disabled={reconnecting}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            title="Restart bridge process and reconnect session"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconnecting ? 'animate-spin' : ''}`} />
            <span>Restart</span>
          </button>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 p-1"
        >
          <span>{expanded ? 'Less' : 'Details'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Limitations and Architecture Details */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2 animate-in fade-in duration-150">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Known Limitations:
            </span>
            <ul className="list-disc list-inside space-y-1 pl-1">
              {bridge.knownLimitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          </div>

          <div className="pt-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Trust & Relay Note:
            </span>
            <p className="leading-relaxed">{bridge.securityNote}</p>
          </div>
        </div>
      )}
    </div>
  );
};
