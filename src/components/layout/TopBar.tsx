import React, { useMemo } from 'react';
import { useMessaging } from '../../context/MessagingContext';
import { Zap, Activity } from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    simulateIncomingMessage,
    conversations,
    bridges,
    bridgeLatencyMs,
  } = useMessaging();

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  const waBridge = bridges.find((b) => b.id === 'whatsapp');

  const latencyChip = useMemo(() => {
    const state = waBridge?.connectionState;
    if (state === 'needs_auth') {
      return {
        label: 'Re-validate WA',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
        value: null as string | null,
      };
    }
    if (bridgeLatencyMs === null) {
      return {
        label: 'Bridge Latency',
        className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        value: '—',
      };
    }
    if (bridgeLatencyMs < 200) {
      return {
        label: 'Bridge Latency',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
        value: `${bridgeLatencyMs}ms`,
      };
    }
    if (bridgeLatencyMs <= 800) {
      return {
        label: 'Bridge Latency',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
        value: `${bridgeLatencyMs}ms`,
      };
    }
    return {
      label: 'Bridge Latency',
      className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
      value: `${bridgeLatencyMs}ms`,
    };
  }, [bridgeLatencyMs, waBridge?.connectionState]);

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('inbox');
        }}
        className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
        OmniChat
      </a>

      {/* Zone 2: 4-5 single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === 'inbox'
              ? 'text-slate-900 dark:text-slate-100 font-semibold border-b-2 border-slate-900 dark:border-slate-100'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Inbox
          {totalUnread > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-teal-500 text-white">
              {totalUnread}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bridges')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === 'bridges'
              ? 'text-slate-900 dark:text-slate-100 font-semibold border-b-2 border-slate-900 dark:border-slate-100'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Bridge Network
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === 'matrix'
              ? 'text-slate-900 dark:text-slate-100 font-semibold border-b-2 border-slate-900 dark:border-slate-100'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Capability Matrix
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === 'settings'
              ? 'text-slate-900 dark:text-slate-100 font-semibold border-b-2 border-slate-900 dark:border-slate-100'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Settings & Push
        </button>
      </nav>

      {/* Zone 3: Bridge latency + primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tabular-nums ${latencyChip.className}`}
          title={
            waBridge?.connectionState
              ? `WhatsApp bridge: ${waBridge.connectionState}`
              : 'WhatsApp bridge latency'
          }
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">
            {latencyChip.label}
            {latencyChip.value !== null ? (
              <>
                {' '}
                <span className="font-mono">{latencyChip.value}</span>
              </>
            ) : null}
          </span>
        </div>
        <button
          onClick={() => simulateIncomingMessage()}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 dark:text-amber-500" />
          Test Inbound Event
        </button>
      </div>
    </header>
  );
};
