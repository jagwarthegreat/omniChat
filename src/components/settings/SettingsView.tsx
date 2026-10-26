import React, { useState } from 'react';
import {
  Bell,
  Wifi,
  Key,
  Database,
  Shield,
  Smartphone,
  Sun,
  Moon,
  Send,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useMessaging } from '../../context/MessagingContext';
import { useTheme } from '../../context/ThemeContext';
import { NetworkCondition } from '../../types';
import { requestNotificationPermission, showPushNotification } from '../../services/notificationService';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, conversations } = useMessaging();
  const { theme, toggleTheme } = useTheme();
  const [keyExported, setKeyExported] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [testPushSent, setTestPushSent] = useState(false);

  const handleTestPush = async () => {
    await requestNotificationPermission();
    showPushNotification({
      title: 'Mom (WhatsApp)',
      body: 'Test push notification routed via Matrix push gateway -> FCM.',
      service: 'whatsapp',
      roomId: '!wa-family-vacation:homeserver.local',
    });
    setTestPushSent(true);
    setTimeout(() => setTestPushSent(false), 2000);
  };

  const handleExportKeys = () => {
    setKeyExported(true);
    setTimeout(() => setKeyExported(false), 2500);
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Client Settings & Architecture
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure push gateways, network simulations, encryption keys, and privacy controls
          </p>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Network Latency Simulator (Phase 5) */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Wifi className="w-4 h-4 text-teal-500" />
          <h3 className="text-sm font-bold">Network Condition Simulator</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Simulate Android Doze, subway signal drops, or high-latency networks. Offline mode holds messages in an optimistic outbox until reconnected.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'online' as NetworkCondition, label: 'Online (WiFi/5G)', desc: 'Zero lag' },
            { id: 'slow_3g' as NetworkCondition, label: 'Slow 3G Network', desc: '1.8s delay' },
            { id: 'offline' as NetworkCondition, label: 'Offline / Airplane', desc: 'Queues in outbox' },
          ].map((cond) => (
            <button
              key={cond.id}
              onClick={() => updateSettings({ networkCondition: cond.id })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.networkCondition === cond.id
                  ? 'bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300 font-semibold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <span className="text-xs block">{cond.label}</span>
              <span className="text-[10px] text-slate-400 font-normal">{cond.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Push Notifications & Native FCM Gateway (Phase 4) */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Bell className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold">Native Push Gateway (FCM / APNs)</h3>
          </div>
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            FCM Active
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mobile apps cannot keep JavaScript background processes awake indefinitely. Synapse routes push events through the Matrix push gateway (`sygnal`) to Google FCM and Apple APNs.
        </p>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 font-mono text-[11px]">
          <span className="text-slate-400 block text-[10px]">Active FCM Device Token:</span>
          <span className="text-slate-700 dark:text-slate-300 select-all break-all">
            {settings.fcmPushToken}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={settings.previewMessageBody}
              onChange={(e) => updateSettings({ previewMessageBody: e.target.checked })}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Include message text preview in push payload</span>
          </label>

          <button
            onClick={handleTestPush}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            {testPushSent ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Send className="w-3.5 h-3.5" />}
            <span>{testPushSent ? 'Push Dispatched!' : 'Test Push Gateway'}</span>
          </button>
        </div>
      </div>

      {/* E2EE Keys & Device Verification (Phase 1 & Phase 6) */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Key className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold">End-to-End Encryption & Key Backup</h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Matrix Rust Crypto engine (vodozemac) stores Megolm inbound group session keys in secure local storage.
        </p>

        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Cross-Signing Verification State
            </p>
            <p className="text-[11px] text-slate-400">Master, Self-Signing, and User-Signing keys active</p>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold text-teal-600 bg-teal-500/10 rounded-full">
            Verified
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportKeys}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{keyExported ? 'Keys Exported to omnichat-keys.txt' : 'Export Megolm Encryption Keys'}</span>
          </button>
        </div>
      </div>

      {/* Storage & Privacy Controls */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Shield className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold">Privacy & Log Redaction</h3>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.scrubTelemetryLogs}
              onChange={(e) => updateSettings({ scrubTelemetryLogs: e.target.checked })}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>
              Scrub phone numbers, passwords, and message contents from telemetry logs (Phase 6 requirement)
            </span>
          </label>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Media Cache Quota (Capacitor WebView)
              </p>
              <p className="text-[11px] text-slate-400">28.4 MB cached images and audio notes</p>
            </div>
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900/60 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cacheCleared ? 'Cache Cleared!' : 'Clear Cache'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
