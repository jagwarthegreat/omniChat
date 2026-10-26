import React, { useState } from 'react';
import { Check, X, AlertCircle, HelpCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ServiceId } from '../../types';
import { SERVICES_CONFIG } from '../../config/services';
import { ServiceBadge } from '../common/ServiceBadge';
import { TrustBoundaryModal } from '../common/TrustBoundaryModal';

interface CapabilityRow {
  feature: string;
  description: string;
  whatsapp: 'supported' | 'partial' | 'unsupported';
  telegram: 'supported' | 'partial' | 'unsupported';
  discord: 'supported' | 'partial' | 'unsupported';
  messenger: 'supported' | 'partial' | 'unsupported';
  instagram: 'supported' | 'partial' | 'unsupported';
  matrix: 'supported' | 'partial' | 'unsupported';
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  {
    feature: 'Send Text & Unicode',
    description: 'Basic messaging, UTF-8 emojis, multi-line formatting',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Media & Attachments',
    description: 'Images, video, documents, and audio uploads',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Emoji Reactions',
    description: 'Per-message reaction badges and counts',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Message Edits',
    description: 'Modifying text in already delivered messages',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'partial',
    instagram: 'unsupported',
    matrix: 'supported',
  },
  {
    feature: 'Replies & Quoting',
    description: 'Quoting prior events in conversation timeline',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Read Receipts',
    description: 'Double checkmarks indicating message opened',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'unsupported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Voice Notes (Audio)',
    description: 'Playable audio voice messages with waveform',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Typing State',
    description: 'Live indicator when counterparty is composing',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Group & Channel Chats',
    description: 'Multi-party rooms mapped to Matrix space rooms',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Message Redaction / Delete',
    description: 'Revoking or removing sent events for all parties',
    whatsapp: 'supported',
    telegram: 'supported',
    discord: 'supported',
    messenger: 'supported',
    instagram: 'supported',
    matrix: 'supported',
  },
  {
    feature: 'Native End-to-End E2EE',
    description: 'Zero-knowledge encryption preserved across bridge',
    whatsapp: 'partial',
    telegram: 'partial',
    discord: 'unsupported',
    messenger: 'unsupported',
    instagram: 'unsupported',
    matrix: 'supported',
  },
];

export const CapabilityTable: React.FC = () => {
  const [selectedService, setSelectedService] = useState<ServiceId | null>(null);

  const renderStatus = (status: 'supported' | 'partial' | 'unsupported') => {
    switch (status) {
      case 'supported':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Supported</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Partial</span>
          </span>
        );
      case 'unsupported':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <X className="w-3.5 h-3.5" />
            <span>Unsupported</span>
          </span>
        );
    }
  };

  const servicesList: ServiceId[] = [
    'whatsapp',
    'telegram',
    'discord',
    'messenger',
    'instagram',
    'matrix',
  ];

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Bridge Capability Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Phase 0 Feasibility Baseline · Version-pinned mautrix bridges & Matrix protocol capabilities
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Baseline Date:</span>
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            25 October 2026
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <th className="p-3.5 font-semibold text-slate-700 dark:text-slate-300 min-w-[200px]">
                Capability / Feature
              </th>
              {servicesList.map((srv) => (
                <th
                  key={srv}
                  className="p-3.5 font-semibold text-slate-700 dark:text-slate-300 min-w-[120px] text-center"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ServiceBadge service={srv} size="sm" showLabel />
                    <span className="text-[10px] font-mono text-slate-400 font-normal">
                      {SERVICES_CONFIG[srv].bridgePackage.split(' ')[1] || 'SDK'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {CAPABILITY_ROWS.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="p-3.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                    {row.feature}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {row.description}
                  </span>
                </td>
                <td className="p-3.5 text-center">{renderStatus(row.whatsapp)}</td>
                <td className="p-3.5 text-center">{renderStatus(row.telegram)}</td>
                <td className="p-3.5 text-center">{renderStatus(row.discord)}</td>
                <td className="p-3.5 text-center">{renderStatus(row.messenger)}</td>
                <td className="p-3.5 text-center">{renderStatus(row.instagram)}</td>
                <td className="p-3.5 text-center">{renderStatus(row.matrix)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trust Boundary Disclosure Notice */}
      <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 dark:text-teal-200 space-y-1">
          <p className="font-bold">Cryptographic Honesty Policy</p>
          <p className="leading-relaxed">
            As documented in the implementation plan: A bridged conversation never claims end-to-end encryption across the bridge worker. While local Matrix communication uses the Megolm ratchet, the bridge decrypts events before delivering to WhatsApp, Telegram, Messenger, Instagram, or Discord.
          </p>
        </div>
      </div>

      {selectedService && (
        <TrustBoundaryModal
          service={selectedService}
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
};
