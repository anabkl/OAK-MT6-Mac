/**
 * OrderPanel – sends trade execution requests to the Java Executor microservice
 * via the Tauri `execute_order` command.
 *
 * The panel exposes:
 * - Symbol selector
 * - Side toggle (BUY / SELL)
 * - Order type selector (MARKET / LIMIT / STOP)
 * - Units / lot-size input
 * - Optional SL / TP fields
 * - Submit button with loading state
 *
 * All state lives in the global Zustand store so the chart and AI monitor can
 * react to order events in real time.
 */

import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTradingStore } from "@/store/tradingStore";
import type { OrderSide, OrderType, OrderRequest, OrderResponse } from "@/types/trading";

// ---------------------------------------------------------------------------
// Supported symbols (extend as needed)
// ---------------------------------------------------------------------------
const SYMBOLS = ["EUR_USD", "GBP_USD", "USD_JPY", "XAU_USD", "NAS100_USD", "SPX500_USD"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrderPanel() {
  const { pendingOrder, setPendingOrder, addOrder, activeSymbol, setActiveSymbol, latestTick } =
    useTradingStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    if (!pendingOrder.units || pendingOrder.units <= 0) {
      setLastError("Units must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    setLastError(null);
    setLastOrderId(null);

    try {
      const request: OrderRequest = {
        symbol: activeSymbol,
        side: (pendingOrder.side as OrderSide) ?? "BUY",
        type: (pendingOrder.type as OrderType) ?? "MARKET",
        units: pendingOrder.units,
        price: pendingOrder.price,
        stopLoss: pendingOrder.stopLoss,
        takeProfit: pendingOrder.takeProfit,
      };

      // Invoke the Tauri Rust command which proxies to the Java Executor
      const response: OrderResponse = await invoke("execute_order", { request });
      addOrder(response);
      setLastOrderId(response.orderId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setLastError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, pendingOrder, activeSymbol, addOrder]);

  const side = (pendingOrder.side as OrderSide) ?? "BUY";
  const orderType = (pendingOrder.type as OrderType) ?? "MARKET";
  const needsPrice = orderType !== "MARKET";

  const midPrice = latestTick ? ((latestTick.bid + latestTick.ask) / 2).toFixed(5) : "—";

  return (
    <div className="flex flex-col gap-3 p-4 bg-terminal-panel text-terminal-text-primary font-mono text-sm h-full overflow-y-auto">
      {/* ── Header ── */}
      <h2 className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-widest border-b border-terminal-border pb-2">
        Order Entry
      </h2>

      {/* ── Symbol ── */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-terminal-text-secondary">Symbol</span>
        <select
          value={activeSymbol}
          onChange={(e) => setActiveSymbol(e.target.value)}
          className="bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-terminal-text-primary focus:outline-none focus:border-terminal-accent"
        >
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {/* ── Market price ── */}
      <div className="flex justify-between text-xs text-terminal-text-muted">
        <span>MID</span>
        <span className="text-terminal-text-primary font-semibold">{midPrice}</span>
      </div>

      {/* ── Side toggle ── */}
      <div className="flex rounded overflow-hidden border border-terminal-border">
        {(["BUY", "SELL"] as OrderSide[]).map((s) => (
          <button
            key={s}
            onClick={() => setPendingOrder({ side: s })}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              side === s
                ? s === "BUY"
                  ? "bg-terminal-buy text-white"
                  : "bg-terminal-sell text-white"
                : "bg-terminal-bg text-terminal-text-muted hover:text-terminal-text-primary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Order type ── */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-terminal-text-secondary">Type</span>
        <select
          value={orderType}
          onChange={(e) => setPendingOrder({ type: e.target.value as OrderType })}
          className="bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-terminal-text-primary focus:outline-none focus:border-terminal-accent"
        >
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
          <option value="STOP">Stop</option>
        </select>
      </label>

      {/* ── Units ── */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-terminal-text-secondary">Units</span>
        <input
          type="number"
          min={1}
          step={1000}
          value={pendingOrder.units ?? 1000}
          onChange={(e) => setPendingOrder({ units: Number(e.target.value) })}
          className="bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-terminal-text-primary focus:outline-none focus:border-terminal-accent"
        />
      </label>

      {/* ── Limit / Stop price (only for non-market orders) ── */}
      {needsPrice && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-terminal-text-secondary">Price</span>
          <input
            type="number"
            step="0.00001"
            value={pendingOrder.price ?? ""}
            onChange={(e) => setPendingOrder({ price: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="0.00000"
            className="bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-terminal-text-primary focus:outline-none focus:border-terminal-accent"
          />
        </label>
      )}

      {/* ── SL / TP ── */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-terminal-text-secondary">Stop Loss</span>
          <input
            type="number"
            step="0.00001"
            value={pendingOrder.stopLoss ?? ""}
            onChange={(e) => setPendingOrder({ stopLoss: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="0.00000"
            className="bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-terminal-text-primary focus:outline-none focus:border-terminal-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-terminal-text-secondary">Take Profit</span>
          <input
            type="number"
            step="0.00001"
            value={pendingOrder.takeProfit ?? ""}
            onChange={(e) => setPendingOrder({ takeProfit: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="0.00000"
            className="bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-terminal-text-primary focus:outline-none focus:border-terminal-accent"
          />
        </label>
      </div>

      {/* ── Submit ── */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`mt-2 py-2.5 rounded font-bold uppercase tracking-widest text-sm transition-all ${
          isSubmitting
            ? "opacity-50 cursor-not-allowed bg-terminal-border"
            : side === "BUY"
            ? "bg-terminal-buy hover:bg-green-400 text-white"
            : "bg-terminal-sell hover:bg-red-400 text-white"
        }`}
      >
        {isSubmitting ? "Sending…" : `${side} ${activeSymbol}`}
      </button>

      {/* ── Feedback ── */}
      {lastError && (
        <p className="text-xs text-terminal-sell bg-terminal-sell/10 rounded px-2 py-1.5 border border-terminal-sell/30">
          ✕ {lastError}
        </p>
      )}
      {lastOrderId && !lastError && (
        <p className="text-xs text-terminal-buy bg-terminal-buy/10 rounded px-2 py-1.5 border border-terminal-buy/30">
          ✓ Order #{lastOrderId} submitted
        </p>
      )}
    </div>
  );
}
