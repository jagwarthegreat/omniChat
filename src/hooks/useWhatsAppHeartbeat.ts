import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { BridgeInfo, ConnectionState, ConversationSummary } from '../types';

const HEARTBEAT_INTERVAL_MS = 15_000;

const mapConnectionState = (raw: string): ConnectionState =>
  raw === 'qr_ready' ? 'needs_auth' : (raw as ConnectionState);

export interface UseWhatsAppHeartbeatParams {
  setBridgeLatencyMs: Dispatch<SetStateAction<number | null>>;
  setBridges: Dispatch<SetStateAction<BridgeInfo[]>>;
  setConversations: Dispatch<SetStateAction<ConversationSummary[]>>;
}

/**
 * Persistent client↔bridge heartbeat: pings /api/whatsapp/ping every 15s,
 * measures RTT, and refreshes WhatsApp connection state without forcing QR.
 */
export function useWhatsAppHeartbeat({
  setBridgeLatencyMs,
  setBridges,
  setConversations,
}: UseWhatsAppHeartbeatParams): void {
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const applyState = (mappedState: ConnectionState, phone?: string, latencyMs?: number) => {
      setBridges((prev) =>
        prev.map((b) =>
          b.id === 'whatsapp'
            ? {
                ...b,
                connectionState: mappedState,
                accountIdentifier: phone || b.accountIdentifier,
                lastSyncAt: Date.now(),
                ...(typeof latencyMs === 'number' ? { latencyMs } : {}),
              }
            : b
        )
      );

      setConversations((prev) =>
        prev.map((c) => (c.service === 'whatsapp' ? { ...c, connectionState: mappedState } : c))
      );
    };

    const ping = async () => {
      if (cancelled || inFlightRef.current) return;
      inFlightRef.current = true;
      const t0 = Date.now();

      try {
        const res = await fetch('/api/whatsapp/ping');
        const rtt = Date.now() - t0;

        if (!res.ok) {
          setBridgeLatencyMs(null);
          const statusRes = await fetch('/api/whatsapp/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData?.connectionState) {
              applyState(mapConnectionState(statusData.connectionState), statusData.phone);
            }
          }
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        setBridgeLatencyMs(rtt);

        if (data?.connectionState) {
          applyState(mapConnectionState(data.connectionState), data.phone, rtt);
        } else {
          setBridges((prev) =>
            prev.map((b) =>
              b.id === 'whatsapp' ? { ...b, latencyMs: rtt, lastSyncAt: Date.now() } : b
            )
          );
        }
      } catch {
        if (cancelled) return;
        setBridgeLatencyMs(null);
        try {
          const statusRes = await fetch('/api/whatsapp/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData?.connectionState) {
              applyState(mapConnectionState(statusData.connectionState), statusData.phone);
            }
          }
        } catch {
          // Backend unreachable — leave prior bridge state; latency already cleared
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    ping();
    const intervalId = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [setBridgeLatencyMs, setBridges, setConversations]);
}
