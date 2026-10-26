/**
 * OmniChat — Unified Messaging App
 * React + TypeScript + Vite + Capacitor-ready architecture
 * Bridging WhatsApp, Telegram, Discord, Messenger, Instagram via Matrix
 */

import React, { useState } from 'react';
import { MessagingProvider, useMessaging } from './context/MessagingContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TopBar } from './components/layout/TopBar';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { ConversationList } from './components/inbox/ConversationList';
import { ChatHeader } from './components/chat/ChatHeader';
import { MessageTimeline } from './components/chat/MessageTimeline';
import { MessageComposer } from './components/chat/MessageComposer';
import { ChatInfoDrawer } from './components/chat/ChatInfoDrawer';
import { BridgeManager } from './components/bridges/BridgeManager';
import { CapabilityTable } from './components/bridges/CapabilityTable';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { SettingsView } from './components/settings/SettingsView';
import { NewChatModal } from './components/inbox/NewChatModal';
import { InAppToastBanner } from './components/common/InAppToastBanner';
import { ReplyContext } from './types';
import {
  MessageSquare,
  Shield,
  Smartphone,
  Monitor,
  Zap,
  Lock,
  Search,
  Wifi,
  WifiOff,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeRoomId,
    activeRoom,
    activeMessages,
    setActiveRoomId,
    activeTab,
    sendMessage,
    retryMessage,
    toggleReaction,
    deleteMessage,
    editMessage,
    isTyping,
    settings,
    updateSettings,
    bridges,
  } = useMessaging();

  const [replyTo, setReplyTo] = useState<ReplyContext | undefined>(undefined);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [inChatSearch, setInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  const connectedBridgesCount = bridges.filter((b) => b.connectionState === 'connected').length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-teal-500 selection:text-white">
      {/* Top Navigation Bar adhering strictly to the Top Bar Contract */}
      <TopBar />

      {/* Real-time Push Alert Banner */}
      <InAppToastBanner />

      {/* Network & Device Simulation Toolbar (Below Top Bar) */}
      <div className="bg-slate-200/80 dark:bg-slate-900/60 border-b border-slate-300/50 dark:border-slate-800 px-6 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            {settings.networkCondition === 'offline' ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-500" />
                <span className="font-semibold text-red-600 dark:text-red-400">Offline Outbox Mode</span>
              </>
            ) : settings.networkCondition === 'slow_3g' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-amber-600 dark:text-amber-400">Slow 3G Simulation</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium">Network Synced</span>
              </>
            )}
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
            Synapse: <strong className="font-mono text-slate-700 dark:text-slate-300">1.115.0</strong> · {connectedBridgesCount}/6 Bridges Online
          </span>
        </div>

        {/* Viewport Frame Mode Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className={`px-2.5 py-0.5 rounded-md font-medium text-[11px] flex items-center gap-1.5 transition-colors ${
              isMobileFrame
                ? 'bg-teal-500 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle native mobile phone canvas frame"
          >
            {isMobileFrame ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
            <span>{isMobileFrame ? 'Android Mobile Frame' : 'Responsive Desktop'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center p-0 md:p-4">
        {/* Responsive Container or Mobile Frame */}
        <div
          className={`w-full transition-all duration-200 ${
            isMobileFrame
              ? 'max-w-[420px] h-[844px] my-4 rounded-[40px] border-[8px] border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col relative bg-white dark:bg-slate-900 ring-1 ring-slate-900/10'
              : 'max-w-7xl h-[calc(100vh-100px)] flex flex-col bg-white dark:bg-slate-900 md:rounded-2xl md:border md:border-slate-200 dark:md:border-slate-800 md:shadow-sm overflow-hidden'
          }`}
        >
          {/* Mobile Status Bar if in Phone Frame */}
          {isMobileFrame && (
            <div className="h-7 bg-slate-900 text-white flex items-center justify-between px-6 text-[11px] font-mono select-none shrink-0 z-30">
              <span>9:41</span>
              <div className="w-20 h-4 bg-black rounded-b-xl -mt-1 mx-auto" />
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3" />
                <div className="w-4 h-2 border border-white rounded-xs p-0.5 flex items-center">
                  <div className="h-full w-full bg-white rounded-2xs" />
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Inbox (Unified Messenger Split View) */}
          {activeTab === 'inbox' && (
            <div className="flex-1 flex overflow-hidden relative">
              {/* Left Column: Conversation List */}
              <div
                className={`w-full md:w-96 shrink-0 h-full ${
                  activeRoomId ? 'hidden md:flex flex-col' : 'flex flex-col'
                }`}
              >
                <ConversationList onStartNewChat={() => setShowNewChatModal(true)} />
              </div>

              {/* Right Column: Active Conversation Timeline or Blank State */}
              <div
                className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-900 relative ${
                  !activeRoomId ? 'hidden md:flex' : 'flex'
                }`}
              >
                {activeRoom ? (
                  <>
                    <ChatHeader
                      conversation={activeRoom}
                      isTyping={isTyping}
                      onBack={() => setActiveRoomId(null)}
                      onToggleInfo={() => setShowInfoDrawer(!showInfoDrawer)}
                      onToggleSearch={() => setInChatSearch(!inChatSearch)}
                    />

                    {/* In-chat search bar */}
                    {inChatSearch && (
                      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={inChatSearchQuery}
                          onChange={(e) => setInChatSearchQuery(e.target.value)}
                          placeholder="Search in this conversation..."
                          className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 outline-none"
                          autoFocus
                        />
                        {inChatSearchQuery && (
                          <button
                            onClick={() => setInChatSearchQuery('')}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}

                    <MessageTimeline
                      messages={activeMessages}
                      capabilities={activeRoom.capabilities}
                      isTyping={isTyping}
                      searchFilter={inChatSearch ? inChatSearchQuery : ''}
                      onReply={(ctx) => setReplyTo(ctx)}
                      onToggleReaction={toggleReaction}
                      onDeleteMessage={deleteMessage}
                      onEditMessage={editMessage}
                      onRetryMessage={retryMessage}
                    />

                    <MessageComposer
                      capabilities={activeRoom.capabilities}
                      replyTo={replyTo}
                      onClearReply={() => setReplyTo(undefined)}
                      onSend={sendMessage}
                    />

                    <ChatInfoDrawer
                      conversation={activeRoom}
                      isOpen={showInfoDrawer}
                      onClose={() => setShowInfoDrawer(false)}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 shadow-sm">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                      OmniChat Unified Inbox
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                      Select a bridged conversation from the left to read and send messages across WhatsApp, Telegram, Discord, Messenger, and Instagram.
                    </p>

                    <div className="grid grid-cols-2 gap-3 max-w-md w-full text-left">
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Lock className="w-4 h-4 text-teal-500 mb-1.5" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Matrix Protocol Core
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Single client connection talking to Synapse homeserver
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Shield className="w-4 h-4 text-amber-500 mb-1.5" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          5 Mautrix Bridges
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          All five networks mapped into one synchronized timeline
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Global Search */}
          {activeTab === 'search' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/40 dark:bg-slate-950/20">
              <GlobalSearchModal />
            </div>
          )}

          {/* Tab 3: Bridges Management */}
          {activeTab === 'bridges' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/40 dark:bg-slate-950/20">
              <BridgeManager />
            </div>
          )}

          {/* Tab 4: Capability Matrix */}
          {activeTab === 'matrix' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/40 dark:bg-slate-950/20">
              <CapabilityTable />
            </div>
          )}

          {/* Tab 5: Settings */}
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/40 dark:bg-slate-950/20">
              <SettingsView />
            </div>
          )}

          {/* Mobile Bottom Tab Bar for Smartphone Screen */}
          <MobileTabBar />
        </div>
      </main>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <MessagingProvider>
        <MainLayout />
      </MessagingProvider>
    </ThemeProvider>
  );
}
