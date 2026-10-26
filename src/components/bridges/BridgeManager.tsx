import React, { useState } from 'react';
import { useMessaging } from '../../context/MessagingContext';
import { BridgeCard } from './BridgeCard';
import { ServiceId } from '../../types';
import { WhatsAppModal } from './modals/WhatsAppModal';
import { TelegramModal } from './modals/TelegramModal';
import { DiscordModal } from './modals/DiscordModal';
import { MessengerModal } from './modals/MessengerModal';
import { InstagramModal } from './modals/InstagramModal';
import { MatrixHomeserverModal } from './modals/MatrixHomeserverModal';
import { Plus, RefreshCw, Server, ShieldCheck } from 'lucide-react';

export const BridgeManager: React.FC = () => {
  const { bridges, reconnectBridge } = useMessaging();
  const [activeModal, setActiveModal] = useState<ServiceId | null>(null);

  const connectedCount = bridges.filter((b) => b.connectionState === 'connected').length;
  const needsAuthCount = bridges.filter((b) => b.connectionState === 'needs_auth').length;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Bridge Network Dashboard</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Mautrix application-service bridges connected to local Synapse Matrix homeserver
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">
            {connectedCount} Connected
          </div>
          {needsAuthCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold">
              {needsAuthCount} Needs Action
            </div>
          )}
        </div>
      </div>

      {/* Bridge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bridges.map((bridge) => (
          <BridgeCard
            key={bridge.id}
            bridge={bridge}
            onRelink={(id) => setActiveModal(id)}
            onReconnect={(id) => reconnectBridge(id)}
          />
        ))}
      </div>

      {/* Onboarding Modals */}
      <WhatsAppModal isOpen={activeModal === 'whatsapp'} onClose={() => setActiveModal(null)} />
      <TelegramModal isOpen={activeModal === 'telegram'} onClose={() => setActiveModal(null)} />
      <DiscordModal isOpen={activeModal === 'discord'} onClose={() => setActiveModal(null)} />
      <MessengerModal isOpen={activeModal === 'messenger'} onClose={() => setActiveModal(null)} />
      <InstagramModal isOpen={activeModal === 'instagram'} onClose={() => setActiveModal(null)} />
      <MatrixHomeserverModal isOpen={activeModal === 'matrix'} onClose={() => setActiveModal(null)} />
    </div>
  );
};
