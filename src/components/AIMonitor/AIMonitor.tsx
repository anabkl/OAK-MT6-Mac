/**
 * AIMonitor – displays live AI trading signals from the Python Brain
 * (LSTM + Multi-Head Attention model).
 *
 * Features:
 * - Shows the latest signal prominently (direction, confidence gauge, TP/SL).
 * - Scrollable history table of recent signals.
 * - "Apply to Order" shortcut that pre-fills the OrderPanel from the signal.
 */

import { useCallback } from "react";
import { useTradingStore } from "@/store/tradingStore";
import type { AiSignal, SignalDirection } from "@/types/trading";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return "text-terminal-buy";
  if (confidence >= 0.5) return "text-yellow-400";
  return "text-terminal-sell";
}

function directionBadge(direction: SignalDirection): string {
  switch (direction) {
    case "BUY":
      return "bg-terminal-buy/20 text-terminal-buy border-terminal-buy/40";
    case "SELL":
      return "bg-terminal-sell/20 text-terminal-sell border-terminal-sell/40";
    default:
      return "bg-terminal-text-muted/20 text-terminal-text-muted border-terminal-text-muted/40";
  }
}

function formatPrice(price: number): string {
  return price.toFixed(5);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Confidence gauge bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-terminal-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 75 ? "bg-terminal-buy" : pct >= 50 ? "bg-yellow-400" : "bg-terminal-sell"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-9 text-right ${confidenceColor(value)}`}>{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single signal card (used for the "latest" featured signal)
// ---------------------------------------------------------------------------

interface SignalCardProps {
  signal: AiSignal;
  onApply: (signal: AiSignal) => void;
}

function SignalCard({ signal, onApply }: SignalCardProps) {
  return (
    <div className="rounded border border-terminal-border bg-terminal-bg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${directionBadge(signal.direction)}`}
        >
          {signal.direction}
        </span>
        <span className="text-xs text-terminal-text-muted font-mono">{formatTime(signal.generatedAt)}</span>
      </div>

      <ConfidenceBar value={signal.confidence} />

      <div className="grid grid-cols-3 gap-1 text-xs font-mono mt-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-terminal-text-muted">Entry</span>
          <span className="text-terminal-text-primary">{formatPrice(signal.entryPrice)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-terminal-text-muted">SL</span>
          <span className="text-terminal-sell">{formatPrice(signal.stopLoss)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-terminal-text-muted">TP</span>
          <span className="text-terminal-buy">{formatPrice(signal.takeProfit)}</span>
        </div>
      </div>

      {signal.rationale && (
        <p className="text-xs text-terminal-text-muted italic leading-relaxed">
          {signal.rationale}
        </p>
      )}

      <button
        onClick={() => onApply(signal)}
        className="mt-1 py-1.5 rounded text-xs font-bold uppercase tracking-widest bg-terminal-accent/20 text-terminal-accent hover:bg-terminal-accent/30 border border-terminal-accent/40 transition-colors"
      >
        Apply to Order Panel ↗
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AIMonitor() {
  const signals = useTradingStore((s) => s.signals);
  const clearSignals = useTradingStore((s) => s.clearSignals);
  const setPendingOrder = useTradingStore((s) => s.setPendingOrder);
  const tickFeedStatus = useTradingStore((s) => s.tickFeedStatus);

  const handleApply = useCallback(
    (signal: AiSignal) => {
      setPendingOrder({
        side: signal.direction === "BUY" ? "BUY" : "SELL",
        type: "MARKET",
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        price: signal.entryPrice,
      });
    },
    [setPendingOrder]
  );

  const latestSignal = signals[0] ?? null;

  return (
    <div className="flex flex-col gap-3 p-4 bg-terminal-panel text-terminal-text-primary font-mono text-sm h-full overflow-y-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-2">
        <h2 className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-widest">
          AI Signal Monitor
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs px-1.5 py-0.5 rounded ${
              tickFeedStatus === "CONNECTED"
                ? "text-terminal-buy"
                : "text-terminal-text-muted"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                tickFeedStatus === "CONNECTED" ? "bg-terminal-buy animate-pulse" : "bg-terminal-text-muted"
              }`}
            />
            Brain
          </span>
          {signals.length > 0 && (
            <button
              onClick={clearSignals}
              className="text-xs text-terminal-text-muted hover:text-terminal-text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Latest signal ── */}
      {latestSignal ? (
        <SignalCard signal={latestSignal} onApply={handleApply} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-terminal-text-muted">
          <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-xs">No signals yet — model is idle</p>
        </div>
      )}

      {/* ── Signal history table ── */}
      {signals.length > 1 && (
        <div className="mt-2">
          <h3 className="text-xs text-terminal-text-muted uppercase tracking-widest mb-1.5">
            History ({signals.length - 1})
          </h3>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
            {signals.slice(1).map((sig) => (
              <div
                key={sig.id}
                className="flex items-center justify-between text-xs bg-terminal-bg rounded px-2 py-1.5 border border-terminal-border"
              >
                <span
                  className={`font-bold uppercase w-10 ${
                    sig.direction === "BUY"
                      ? "text-terminal-buy"
                      : sig.direction === "SELL"
                      ? "text-terminal-sell"
                      : "text-terminal-text-muted"
                  }`}
                >
                  {sig.direction}
                </span>
                <span className="text-terminal-text-secondary">{formatPrice(sig.entryPrice)}</span>
                <span className={confidenceColor(sig.confidence)}>
                  {Math.round(sig.confidence * 100)}%
                </span>
                <span className="text-terminal-text-muted">{formatTime(sig.generatedAt)}</span>
                <button
                  onClick={() => handleApply(sig)}
                  className="text-terminal-accent hover:text-terminal-accent/70 transition-colors"
                  title="Apply to order panel"
                >
                  ↗
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
