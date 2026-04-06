/**
 * Global Zustand store for the trading terminal.
 *
 * Keeps all real-time state (ticks, OHLC bars, AI signals, order history) and
 * exposes typed actions so components never mutate state directly.
 */

import { create } from "zustand";
import type {
  AiSignal,
  ConnectionStatus,
  OhlcBar,
  OrderRequest,
  OrderResponse,
  TickData,
} from "@/types/trading";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface TradingState {
  // ── Instrument ────────────────────────────────────────────────────────────
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;

  // ── Connection ────────────────────────────────────────────────────────────
  tickFeedStatus: ConnectionStatus;
  setTickFeedStatus: (status: ConnectionStatus) => void;

  // ── Live tick ─────────────────────────────────────────────────────────────
  latestTick: TickData | null;
  setLatestTick: (tick: TickData) => void;

  // ── OHLC chart data ───────────────────────────────────────────────────────
  /** Keep the last N bars in memory (ring-buffer style) */
  ohlcBars: OhlcBar[];
  appendOhlcBar: (bar: OhlcBar) => void;
  setOhlcBars: (bars: OhlcBar[]) => void;

  // ── AI signals ────────────────────────────────────────────────────────────
  signals: AiSignal[];
  addSignal: (signal: AiSignal) => void;
  clearSignals: () => void;

  // ── Order history ─────────────────────────────────────────────────────────
  orders: OrderResponse[];
  addOrder: (order: OrderResponse) => void;

  // ── Pending order (form state) ────────────────────────────────────────────
  pendingOrder: Partial<OrderRequest>;
  setPendingOrder: (partial: Partial<OrderRequest>) => void;
  resetPendingOrder: () => void;
}

// ---------------------------------------------------------------------------
// Max bars kept in memory (prevents unbounded growth)
// ---------------------------------------------------------------------------
const MAX_OHLC_BARS = 2_000;
const MAX_SIGNALS = 100;
const MAX_ORDERS = 500;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTradingStore = create<TradingState>((set) => ({
  // ── Instrument ────────────────────────────────────────────────────────────
  activeSymbol: "EUR_USD",
  setActiveSymbol: (symbol) =>
    set({ activeSymbol: symbol, ohlcBars: [], signals: [], latestTick: null }),

  // ── Connection ────────────────────────────────────────────────────────────
  tickFeedStatus: "DISCONNECTED",
  setTickFeedStatus: (status) => set({ tickFeedStatus: status }),

  // ── Live tick ─────────────────────────────────────────────────────────────
  latestTick: null,
  setLatestTick: (tick) => set({ latestTick: tick }),

  // ── OHLC chart data ───────────────────────────────────────────────────────
  ohlcBars: [],
  appendOhlcBar: (bar) =>
    set((state) => {
      const existing = [...state.ohlcBars];
      const last = existing[existing.length - 1];
      if (last && last.time === bar.time) {
        // Update the latest bar in place (real-time tick aggregation)
        existing[existing.length - 1] = bar;
        return { ohlcBars: existing };
      }
      const next = [...existing, bar];
      return { ohlcBars: next.length > MAX_OHLC_BARS ? next.slice(-MAX_OHLC_BARS) : next };
    }),
  setOhlcBars: (bars) => set({ ohlcBars: bars }),

  // ── AI signals ────────────────────────────────────────────────────────────
  signals: [],
  addSignal: (signal) =>
    set((state) => {
      const next = [signal, ...state.signals];
      return { signals: next.length > MAX_SIGNALS ? next.slice(0, MAX_SIGNALS) : next };
    }),
  clearSignals: () => set({ signals: [] }),

  // ── Order history ─────────────────────────────────────────────────────────
  orders: [],
  addOrder: (order) =>
    set((state) => {
      const next = [order, ...state.orders];
      return { orders: next.length > MAX_ORDERS ? next.slice(0, MAX_ORDERS) : next };
    }),

  // ── Pending order ─────────────────────────────────────────────────────────
  pendingOrder: { symbol: "EUR_USD", type: "MARKET", side: "BUY", units: 1000 },
  setPendingOrder: (partial) =>
    set((state) => ({ pendingOrder: { ...state.pendingOrder, ...partial } })),
  resetPendingOrder: () =>
    set({ pendingOrder: { symbol: "EUR_USD", type: "MARKET", side: "BUY", units: 1000 } }),
}));
