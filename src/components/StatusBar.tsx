/**
 * StatusBar – bottom bar showing live tick prices, connection status,
 * and UTC clock (updates every second).
 */

import { useState, useEffect } from "react";
import { useTradingStore } from "@/store/tradingStore";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function nowUtc(): string {
  const d = new Date();
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

export default function StatusBar() {
  const latestTick = useTradingStore((s) => s.latestTick);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const tickFeedStatus = useTradingStore((s) => s.tickFeedStatus);

  const isLive = tickFeedStatus === "CONNECTED";

  // Update the clock every second
  const [utcTime, setUtcTime] = useState(nowUtc);
  useEffect(() => {
    const id = setInterval(() => setUtcTime(nowUtc()), 1_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-4 px-4 py-1 bg-terminal-header border-t border-terminal-border text-xs font-mono text-terminal-text-muted select-none">
      {/* Symbol */}
      <span className="text-terminal-text-secondary">{activeSymbol}</span>

      {/* Bid / Ask */}
      {latestTick ? (
        <>
          <span>
            BID:{" "}
            <span className="text-terminal-sell font-semibold">
              {latestTick.bid.toFixed(5)}
            </span>
          </span>
          <span>
            ASK:{" "}
            <span className="text-terminal-buy font-semibold">
              {latestTick.ask.toFixed(5)}
            </span>
          </span>
          <span>
            SPR:{" "}
            <span className="text-terminal-accent">
              {((latestTick.ask - latestTick.bid) * 100_000).toFixed(1)}
            </span>
          </span>
        </>
      ) : (
        <span className="italic opacity-50">No tick data</span>
      )}

      {/* Spacer */}
      <span className="ml-auto" />

      {/* Feed status */}
      <span
        className={`flex items-center gap-1.5 ${
          isLive ? "text-terminal-buy" : "text-terminal-sell"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-terminal-buy animate-pulse" : "bg-terminal-sell"}`}
        />
        {isLive ? "Feed: Live" : `Feed: ${tickFeedStatus}`}
      </span>

      {/* UTC clock */}
      <span>{utcTime}</span>
    </div>
  );
}
