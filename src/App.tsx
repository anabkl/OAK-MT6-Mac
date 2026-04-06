/**
 * App – root layout of Lahra-MT6-Pro.
 *
 * Layout (Bloomberg terminal style):
 * ┌─────────────────────────────────────────────────────────┐
 * │  Header (logo, symbol, account info)                    │
 * ├────────────────────────────────────┬────────────────────┤
 * │                                    │  AI Monitor        │
 * │  Trading Chart (flex-1)            │  (fixed width)     │
 * │                                    ├────────────────────┤
 * │                                    │  Order Panel       │
 * │                                    │  (fixed width)     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Status Bar (tick prices, spread, feed status)          │
 * └─────────────────────────────────────────────────────────┘
 */

import { useEffect } from "react";
import TradingChart from "@/components/Chart/TradingChart";
import OrderPanel from "@/components/OrderPanel/OrderPanel";
import AIMonitor from "@/components/AIMonitor/AIMonitor";
import StatusBar from "@/components/StatusBar";
import { useTickWebSocket } from "@/hooks/useTickWebSocket";
import { useTradingStore } from "@/store/tradingStore";
import { invoke } from "@tauri-apps/api/tauri";
import type { OhlcBar } from "@/types/trading";

// ---------------------------------------------------------------------------
// Configuration — these URLs point at the local Docker stack.
// In production they should be read from environment variables.
// ---------------------------------------------------------------------------
const WS_FEED_URL = import.meta.env.VITE_WS_FEED_URL ?? "ws://localhost:8000/ws/ticks";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const setOhlcBars = useTradingStore((s) => s.setOhlcBars);

  // ── Connect to live tick / signal WebSocket feed ──────────────────────────
  useTickWebSocket({ url: `${WS_FEED_URL}/${activeSymbol}` });

  // ── Load historical OHLC bars via Tauri command on symbol change ───────────
  useEffect(() => {
    invoke<OhlcBar[]>("fetch_ohlc_history", {
      symbol: activeSymbol,
      count: 500,
      granularity: "M5",
    })
      .then(setOhlcBars)
      .catch((err) => console.warn("[Tauri] fetch_ohlc_history failed:", err));
  }, [activeSymbol, setOhlcBars]);

  return (
    // Force dark mode at the root level
    <div className="dark h-screen w-screen flex flex-col bg-terminal-bg text-terminal-text-primary overflow-hidden select-none">
      {/* ── Top header ── */}
      <header className="flex items-center gap-4 px-4 py-2 bg-terminal-header border-b border-terminal-border shrink-0">
        {/* Logo / brand */}
        <span className="text-terminal-accent font-mono font-bold text-base tracking-widest">
          ⬡ LAHRA‑MT6‑PRO
        </span>

        {/* Version badge */}
        <span className="text-xs text-terminal-text-muted font-mono">v0.1.0-alpha</span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Platform badge */}
        <span className="text-xs font-mono text-terminal-text-muted border border-terminal-border rounded px-2 py-0.5">
          Tauri · React · Rust
        </span>
      </header>

      {/* ── Main content area ── */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {/* Chart takes the remaining width */}
        <TradingChart className="flex-1 min-w-0" />

        {/* Right panel stack */}
        <aside className="w-64 shrink-0 flex flex-col border-l border-terminal-border">
          {/* AI Monitor (top half) */}
          <div className="flex-1 min-h-0 overflow-hidden border-b border-terminal-border">
            <AIMonitor />
          </div>
          {/* Order panel (bottom half) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <OrderPanel />
          </div>
        </aside>
      </main>

      {/* ── Status bar ── */}
      <StatusBar />
    </div>
  );
}
