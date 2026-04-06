/**
 * useTickWebSocket – custom hook that manages a persistent WebSocket connection
 * to the Python Brain's live tick feed.
 *
 * Design principles:
 * - One socket per hook instance; auto-reconnects with exponential back-off.
 * - All heavy parsing happens inside the onmessage handler (off the React render cycle).
 * - State writes go through Zustand actions (no setState inside the hook itself).
 * - Cleanup is handled in the useEffect destructor; no memory leaks.
 */

import { useEffect, useRef, useCallback } from "react";
import { useTradingStore } from "@/store/tradingStore";
import type { WsMessage, TickData, OhlcBar, AiSignal, OrderResponse } from "@/types/trading";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const RECONNECT_MULTIPLIER = 2;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseTickWebSocketOptions {
  url: string;
  /** If false the socket is not opened (e.g. no symbol selected yet). */
  enabled?: boolean;
}

export function useTickWebSocket({ url, enabled = true }: UseTickWebSocketOptions): void {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef<number>(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Zustand actions (stable references — never cause re-render)
  const setTickFeedStatus = useTradingStore((s) => s.setTickFeedStatus);
  const setLatestTick = useTradingStore((s) => s.setLatestTick);
  const appendOhlcBar = useTradingStore((s) => s.appendOhlcBar);
  const addSignal = useTradingStore((s) => s.addSignal);
  const addOrder = useTradingStore((s) => s.addOrder);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;

    setTickFeedStatus("CONNECTING");
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
      setTickFeedStatus("CONNECTED");
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (!isMountedRef.current) return;
      try {
        const msg: WsMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "TICK":
            setLatestTick(msg.payload as TickData);
            break;
          case "OHLC_UPDATE":
            appendOhlcBar(msg.payload as OhlcBar);
            break;
          case "AI_SIGNAL":
            addSignal(msg.payload as AiSignal);
            break;
          case "ORDER_UPDATE":
            addOrder(msg.payload as OrderResponse);
            break;
          case "HEARTBEAT":
            // no-op — connection keep-alive
            break;
          case "ERROR":
            console.error("[WS] Server error:", msg.payload);
            break;
        }
      } catch (err) {
        console.error("[WS] Failed to parse message:", err);
      }
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      setTickFeedStatus("ERROR");
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setTickFeedStatus("DISCONNECTED");
      scheduleReconnect();
    };
  }, [url, enabled, setTickFeedStatus, setLatestTick, appendOhlcBar, addSignal, addOrder]);

  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;
    const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY_MS);
    reconnectDelayRef.current = Math.min(delay * RECONNECT_MULTIPLIER, MAX_RECONNECT_DELAY_MS);
    reconnectTimerRef.current = setTimeout(connect, delay);
  }, [connect, enabled]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect, enabled]);
}
