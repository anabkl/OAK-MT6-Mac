/**
 * TradingChart – live OHLCV candlestick chart powered by TradingView's
 * lightweight-charts library.
 *
 * Features:
 * - Renders a dark-mode candlestick series + volume histogram.
 * - Subscribes to the Zustand store and surgically updates the chart series
 *   on every new bar WITHOUT triggering a full React re-render.
 * - Handles resize via ResizeObserver (no flickering).
 * - Displays a "Connecting…" overlay while the feed is not live.
 */

import { useEffect, useRef, memo } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from "lightweight-charts";
import { useTradingStore } from "@/store/tradingStore";
import type { OhlcBar } from "@/types/trading";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toChartBar(bar: OhlcBar): CandlestickData {
  return {
    time: bar.time as UTCTimestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  };
}

function toVolumeBar(bar: OhlcBar, index: number, bars: OhlcBar[]): HistogramData {
  const prev = index > 0 ? bars[index - 1] : null;
  const isBullish = bar.close >= (prev?.close ?? bar.open);
  return {
    time: bar.time as UTCTimestamp,
    value: bar.volume ?? 0,
    color: isBullish ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
  };
}

// ---------------------------------------------------------------------------
// Chart colours (Bloomberg dark palette)
// ---------------------------------------------------------------------------

const CHART_OPTIONS = {
  layout: {
    background: { type: ColorType.Solid, color: "#0a0a0f" },
    textColor: "#94a3b8",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  grid: {
    vertLines: { color: "#1e1e2e" },
    horzLines: { color: "#1e1e2e" },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: "#f59e0b", width: 1, style: 2 } as const,
    horzLine: { color: "#f59e0b", width: 1, style: 2 } as const,
  },
  rightPriceScale: {
    borderColor: "#1e1e2e",
    textColor: "#94a3b8",
  },
  timeScale: {
    borderColor: "#1e1e2e",
    textColor: "#94a3b8",
    timeVisible: true,
    secondsVisible: false,
  },
  handleScroll: { mouseWheel: true, pressedMouseMove: true },
  handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
} as const;

const CANDLE_SERIES_OPTIONS = {
  upColor: "#22c55e",
  downColor: "#ef4444",
  borderUpColor: "#22c55e",
  borderDownColor: "#ef4444",
  wickUpColor: "#22c55e",
  wickDownColor: "#ef4444",
} as const;

const VOLUME_SERIES_OPTIONS = {
  priceFormat: { type: "volume" as const },
  priceScaleId: "volume",
  scaleMargins: { top: 0.8, bottom: 0 },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TradingChartProps {
  className?: string;
}

const TradingChart = memo(function TradingChart({ className = "" }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Subscribe only to the fields we need; avoids full re-render on unrelated changes.
  const ohlcBars = useTradingStore((s) => s.ohlcBars);
  const tickFeedStatus = useTradingStore((s) => s.tickFeedStatus);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);

  // ── Create chart on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      ...CHART_OPTIONS,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candleSeries = chart.addCandlestickSeries(CANDLE_SERIES_OPTIONS);
    const volumeSeries = chart.addHistogramSeries(VOLUME_SERIES_OPTIONS);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // ResizeObserver – keeps chart filling its container
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.resize(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // ── Sync bar data whenever ohlcBars changes ────────────────────────────────
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || ohlcBars.length === 0) return;

    const candles = ohlcBars.map(toChartBar);
    const volumes = ohlcBars.map(toVolumeBar);

    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);

    // Auto-scroll only if the user hasn't manually panned away
    chartRef.current?.timeScale().scrollToRealTime();
  }, [ohlcBars]);

  // ── Overlay content ────────────────────────────────────────────────────────
  const isLive = tickFeedStatus === "CONNECTED";
  const isConnecting = tickFeedStatus === "CONNECTING";

  return (
    <div className={`relative flex flex-col bg-terminal-bg ${className}`}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-3 py-2 bg-terminal-header border-b border-terminal-border select-none">
        <span className="font-mono text-sm font-semibold text-terminal-accent tracking-widest">
          {activeSymbol}
        </span>

        {/* Connection badge */}
        <span
          className={`flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded ${
            isLive
              ? "bg-terminal-buy/20 text-terminal-buy"
              : isConnecting
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-terminal-sell/20 text-terminal-sell"
          }`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isLive ? "bg-terminal-buy animate-pulse" : isConnecting ? "bg-yellow-400 animate-pulse" : "bg-terminal-sell"
            }`}
          />
          {isLive ? "LIVE" : isConnecting ? "CONNECTING" : "OFFLINE"}
        </span>

        <span className="ml-auto text-xs text-terminal-text-muted font-mono">
          {ohlcBars.length} bars
        </span>
      </div>

      {/* ── Chart canvas ── */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full" />

      {/* ── Empty state overlay ── */}
      {ohlcBars.length === 0 && (
        <div className="absolute inset-0 top-10 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <svg
            className="w-10 h-10 text-terminal-text-muted opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <p className="text-terminal-text-muted text-xs font-mono">
            {isConnecting ? "Waiting for market data…" : "No data — connect to a feed"}
          </p>
        </div>
      )}
    </div>
  );
});

export default TradingChart;
