# Unified Messaging App — Implementation Plan

**Target:** Android first, then iOS and web  
**Frontend:** React + TypeScript + Vite  
**Mobile runtime:** Capacitor  
**Messaging interoperability:** Matrix + mautrix bridges  
**Planning baseline:** 25 October 2026

## 1. Product objective

Build a mobile-first, native-feeling messaging client that brings these services into one app:

- WhatsApp
- Facebook Messenger
- Instagram Direct Messages
- Telegram
- Discord

The app should provide one inbox, one conversation view, global search where feasible, unified notifications, unread counts, service-specific identity and context, and secure account/bridge management.

The goal is **one frontend and a common messaging experience**, not a promise that each platform will expose every native feature. Bridge capabilities and third-party platform changes determine what is actually possible.

## 2. Architecture decisions

### Recommended topology

```text
React + TypeScript + Vite
        |
Capacitor Android shell (iOS later)
        |
Matrix JavaScript SDK (`matrix-js-sdk`)
        |
Matrix homeserver (Synapse + PostgreSQL)
        |
Matrix application-service bridges
  |        |         |          |         |
WhatsApp Telegram Messenger  Instagram  Discord
(mautrix)  (mautrix) (mautrix-meta) (mautrix-instagram) (mautrix)
        |
Native push: Matrix push gateway -> FCM/APNs -> device
```

The mobile app talks to Matrix, **not directly to each bridge**. Each bridge connects the user's Matrix account to one third-party messaging network and maps its chats/users to Matrix rooms and ghost users.

### Stack

- **UI:** React, TypeScript, Vite.
- **Routing:** React Router.
- **Server-state and queries:** TanStack Query where useful; Matrix SDK remains the source of truth for live messaging state.
- **Local UI state:** Zustand or lightweight React state. Avoid duplicating the entire Matrix timeline in a second store.
- **Messaging protocol:** `matrix-js-sdk`.
- **Mobile:** Capacitor, starting with Android; keep the UI responsive to web and iOS constraints.
- **Native services:** Capacitor App, Push Notifications, Keyboard, Status Bar, Haptics and Share plugins as needed.
- **Backend/homeserver:** Matrix Synapse + PostgreSQL, initially in Docker Compose behind Caddy or Traefik.
- **Bridge services:** upstream mautrix bridge images/binaries, individually version-pinned.
- **Operations:** health checks, structured logs, metrics, backups and bridge reconnection alerts.

Use `matrix-js-sdk` for the React client. It supports browser clients and includes Matrix E2EE support via Rust crypto compiled to WebAssembly. Validate encryption storage and IndexedDB behavior in the Capacitor WebView early.

## 3. Repository layout

A practical monorepo layout:

```text
unified-messenger/
├── apps/
│   ├── mobile/                 # React + Vite + Capacitor client
│   └── web/                    # Optional web distribution; can share mobile app initially
├── packages/
│   ├── ui/                     # Shared components, theme, icons
│   ├── matrix-client/          # Matrix SDK setup, auth, sync, room/timeline adapters
│   ├── conversation-model/     # Service-neutral UI models and selectors
│   └── config/                 # TypeScript, ESLint, shared configuration
├── infra/
│   ├── compose.yaml
│   ├── synapse/
│   ├── bridges/
│   │   ├── whatsapp/
│   │   ├── telegram/
│   │   ├── messenger/
│   │   ├── instagram/
│   │   └── discord/
│   ├── reverse-proxy/
│   └── monitoring/
├── docs/
│   ├── architecture.md
│   ├── bridge-capability-matrix.md
│   ├── security-and-privacy.md
│   └── release-checklist.md
└── README.md
```

Keep bridge deployment/configuration out of the mobile app. Never ship homeserver admin tokens, bridge tokens, or platform credentials in the client bundle.

## 4. Implementation phases and acceptance criteria

### Phase 0 — Bridge feasibility spike

**Purpose:** Confirm the five integrations work before spending time on polished UI.

1. Deploy a test Matrix homeserver and PostgreSQL with Docker Compose.
2. Register a test Matrix user and configure application services.
3. Connect one test account for each network, one bridge at a time.
4. Test incoming/outgoing text, attachments, reactions, read receipts, group chats, reconnects and history backfill where supported.
5. Record supported, unsupported and flaky features in `docs/bridge-capability-matrix.md`.
6. Pin known-good bridge versions and document upgrade/rollback steps.

**Exit criteria:** A verified capability matrix exists for all five networks; the team understands login, account linking, required permissions, recovery and known limitations. Do not gate success on unsupported features such as calls or stories.

### Phase 1 — Matrix client foundation

1. Create the React + TypeScript + Vite app and add Capacitor Android.
2. Add `matrix-js-sdk`; create a single client service with explicit initialization/cleanup.
3. Implement Matrix login, logout, session restore, homeserver selection and device verification/recovery UI.
4. Initialize encryption and verify it persists across app restarts and Android process death.
5. Subscribe to room, timeline, receipt, membership and connection events.
6. Add sync status, offline/error states and reconnect handling.

**Exit criteria:** Users can sign in, restore sessions, list rooms and send/receive Matrix messages in an unstyled but functional client. E2EE initialization and recovery are tested, not assumed.

### Phase 2 — Native-feeling inbox and chat UI

Build the interface around a few major screens:

- **Inbox:** unified recent conversations, unread counts, last message, time and source-service icon.
- **Conversation:** message timeline, composer, attachment picker, reply/thread context where the bridge supports it, reactions and read state.
- **Service filters:** All, WhatsApp, Messenger, Instagram, Telegram, Discord.
- **Search:** local/current-room search first; add homeserver search support only where available.
- **Accounts and connections:** status, relink flow, last successful sync, reconnect action and bridge troubleshooting.
- **Settings:** theme, notifications, privacy, media handling and session management.

Use a common conversation model for UI rendering, but preserve Matrix event metadata and service-specific capabilities. Show a clear source badge and a service-specific warning when an action is unsupported. Never silently pretend a reaction, edit, reply or attachment was sent if the bridge rejected it.

### Phase 3 — Bridge onboarding for all five platforms

Create a guided connection flow per service, using each bridge's documented authentication method. Do not implement a single generic “login” form; linking workflows differ.

- **WhatsApp:** linked-device QR/auth flow supported by the deployed bridge; explain the unofficial protocol and account-risk caveat.
- **Telegram:** bridge authentication flow, including any required phone/code/2FA steps.
- **Messenger:** follow the current `mautrix-meta` login flow; test the supported mobile/login modes.
- **Instagram:** configure the separate Instagram bridge binary and use its own supported authentication flow.
- **Discord:** use the current mautrix Discord onboarding and confirm the exact capabilities supported by that release.

Provide per-network statuses: `Not connected`, `Connecting`, `Connected`, `Needs re-authentication`, `Disconnected`, and `Error`. Add a safe reconnect flow that does not erase chat history unless required and explicitly explained.

**Exit criteria:** A new test user can link each service with in-app instructions, see its conversations in the inbox, send/receive supported messages, and recover from an expired session.

### Phase 4 — Push notifications and background behavior

Do not depend on a JavaScript process remaining alive in the background. Mobile OSes suspend or terminate it.

1. Implement a Matrix-compatible push registration flow using native FCM on Android and APNs on iOS.
2. Route homeserver push notifications through a push gateway to the device.
3. Map notification room IDs to conversation routes and open the correct chat on tap.
4. Support per-service notification preferences, mute rules, notification grouping and previews that respect privacy settings.
5. Handle duplicate notifications, read-while-notification-is-arriving races, token refresh and logout/device deregistration.
6. Test Android Doze, battery optimization, network loss, app force-stop and device restart. Document platform limitations honestly.

**Exit criteria:** New messages can trigger native notifications while the app is not foregrounded, and notification taps reliably open the appropriate conversation. Measure end-to-end notification delay and delivery failures.

### Phase 5 — Reliability and polish

- Pagination and history backfill states.
- Optimistic sending with explicit queued/sent/failed states.
- Retry with idempotency safeguards; avoid sending duplicate messages after reconnect.
- Media caching with quotas, cleanup and authenticated downloads.
- Offline/poor-network banner and reconnect indicator.
- Keyboard avoidance, safe areas, Android back navigation, haptics and share-sheet integration.
- Accessibility: scalable text, screen-reader labels and adequate touch targets.
- Crash reporting with secrets, message contents and phone numbers scrubbed from telemetry.
- Capability tests on real Android devices, not just the browser or emulator.

### Phase 6 — Security, privacy and release readiness

- HTTPS everywhere; production homeserver not publicly registered unless federation is intended.
- Keep app-service registration files and bridge admin tokens server-side with least privilege.
- Use secure secret storage for client session material where appropriate; do not store raw platform passwords in app preferences.
- Encrypt and back up PostgreSQL and bridge state; document restore drills.
- Provide device/session management and a clear account-disconnection procedure.
- Define log retention and redact phone numbers, access tokens, cookies, QR payloads and message bodies.
- Make the bridge trust boundary explicit: bridge operators/homeserver may be able to access bridged message content. Do not claim that a bridged conversation retains native end-to-end encryption end-to-end across the bridge.
- Review the upstream AGPL licenses and any third-party components before distribution. If modifying/redistributing AGPL bridge code, get licensing advice on obligations.
- Review each platform's terms and policies, and avoid claiming official endorsement or official API integration where none exists.

## 5. Data and state model

Let Matrix remain the source of truth for conversation timelines and read state. Avoid maintaining a second independent message database unless a concrete feature requires it.

The UI can derive a lightweight model:

```ts
type ServiceId =
  | 'whatsapp'
  | 'telegram'
  | 'messenger'
  | 'instagram'
  | 'discord'
  | 'matrix';

type ConversationSummary = {
  roomId: string;
  service: ServiceId;
  title: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastActivityAt?: number;
  unreadCount: number;
  isEncrypted: boolean;
  connectionState: 'connected' | 'degraded' | 'disconnected';
  capabilities: {
    sendText: boolean;
    sendMedia: boolean;
    reactions: boolean;
    edits: boolean;
    replies: boolean;
    readReceipts: boolean;
  };
};
```

The service ID and capability flags should be determined from bridge metadata/configuration and tested behavior, not guessed from a room title. Unknown or non-bridged Matrix rooms should remain usable as ordinary Matrix conversations or be filterable separately.

## 6. Native UX principles

- One inbox, but preserve service identity visibly; users should never wonder which network a message came from.
- Use one consistent composer, adapting attachment/reaction/reply controls to the room's actual capabilities.
- Use native push notifications and deep links instead of keeping service WebViews alive in the background.
- Add account health and relink actions directly to service settings.
- Support Android system back, edge-to-edge/safe areas, keyboard resizing and accessible touch targets.
- Keep the first release focused on messaging. Voice/video calls, stories, channels, bots, status updates and advanced Discord server administration should be separate later scopes.

## 7. Operational setup

Initial development can run in Docker Compose:

- Synapse
- PostgreSQL
- mautrix-whatsapp
- mautrix-telegram
- mautrix-meta (Messenger)
- mautrix-instagram (separate binary/image from the same project)
- mautrix-discord
- reverse proxy with TLS
- monitoring/log aggregation

Start with one homeserver and one test account. Scale only after measuring actual bridge CPU/memory use and event load. Bridges are separate services: independently pin, health-check, update and roll back them. Use the project documentation for the supported app-service registration and authentication setup; do not copy random config snippets across bridge versions.

## 8. Testing matrix

Test at least the following across every bridge where applicable:

- Incoming and outgoing text, Unicode and long messages.
- Direct messages and group/channel conversations.
- Image, video, file, audio/voice-note sending and downloading.
- Replies, edits, deletes, reactions, read receipts and typing state.
- Contact/avatar updates and room naming changes.
- Login expiry, bridge restart, homeserver restart, lost network and re-authentication.
- History backfill, duplicate prevention and ordering around reconnects.
- Notification delivery in foreground, background, process-killed and battery-optimized states.
- Android screen sizes, keyboard, landscape and accessibility scaling.

Use a per-service matrix with `Supported`, `Partial`, `Unsupported`, or `Not tested`, and attach the tested bridge version and date.

## 9. Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Third-party services change private APIs or login flows | Version pinning, bridge health monitoring, fast rollback, clear connection states |
| WhatsApp account restrictions | Warn users, avoid aggressive reconnect loops, follow bridge guidance, test with accounts the developer is willing to risk |
| Unsupported feature assumptions | Maintain the capability matrix; gate/hide unsupported actions |
| Push fails when the app is killed | Use server-to-native push via Matrix push gateway and FCM/APNs; test on real devices |
| E2EE misunderstandings across bridges | Clear privacy documentation and threat model; never imply native E2EE remains intact end-to-end through a bridge |
| Credential/session compromise | TLS, least privilege, secret storage, redacted logs, backups and rotation |
| Bridge overload or lag | Independent services, metrics, queue/backlog monitoring and alerting |
| AGPL/license obligations | Audit licenses before forking or distributing binaries; preserve notices and comply with source obligations |

## 10. Definition of MVP complete

The first public beta is ready when:

1. Users can sign into Matrix and keep their session across app restarts.
2. Each of the five services has a documented, tested bridge onboarding path.
3. Connected conversations appear in one inbox with source identity, unread counts and reliable text sending/receiving for supported services.
4. Native push notifications and deep links work on Android in normal background conditions.
5. Expired bridge connections are detectable and recoverable without losing unrelated Matrix data.
6. Encryption, bridge trust boundaries, account-risk caveats, data handling and known feature gaps are documented.
7. The project has automated checks, version-pinned deployment config, a tested backup/restore path and a way to monitor bridge health.

## 11. Suggested first sprint

1. Scaffold React + TypeScript + Vite + Capacitor Android.
2. Create Docker Compose for Synapse + PostgreSQL + TLS/reverse proxy in a development environment.
3. Bring up **one bridge first**, preferably Telegram or WhatsApp, and send/receive messages through a minimal `matrix-js-sdk` screen.
4. Verify Matrix E2EE storage in Android WebView before investing in the full UI.
5. Add the inbox and conversation UI only after the first bridge works end-to-end.
6. Add the remaining bridges one at a time and update the capability matrix as evidence is gathered.

## 12. Upstream references

- Matrix bridges overview: https://matrix.org/ecosystem/bridges/
- Bridge status overview: https://matrixdocs.github.io/docs/bridges/overview
- Matrix JavaScript SDK: https://github.com/matrix-org/matrix-js-sdk
- mautrix WhatsApp: https://github.com/mautrix/whatsapp
- mautrix Telegram: https://github.com/mautrix/telegram
- mautrix Messenger / Instagram: https://github.com/mautrix/meta
- mautrix Discord: https://github.com/mautrix/discord
- Capacitor documentation: https://capacitorjs.com/docs
- Matrix push notification spec: https://spec.matrix.org/latest/client-server-api/#push-notifications

**Important:** This is an implementation plan, not a guarantee that all five networks will remain connectable. Bridge support is community-maintained and can change when upstream services change their protocols or policies. Verify live bridge status and licensing before every public release.
