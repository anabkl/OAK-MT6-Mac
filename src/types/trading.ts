/**
 * Core trading domain types shared across the frontend.
 */

// ---------------------------------------------------------------------------
// Candlestick / OHLCV
// ---------------------------------------------------------------------------

/** A single OHLCV candlestick bar (lightweight-charts compatible). */
export interface OhlcBar {
  /** Unix timestamp in seconds */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Optional volume — may be absent if the broker feed does not supply it. */
  volume?: number;
}

/** A single volume bar (lightweight-charts compatible). */
export interface VolumeBar {
  time: number;
  value: number;
  color?: string;
}

// ---------------------------------------------------------------------------
// Live tick (WebSocket feed)
// ---------------------------------------------------------------------------

export interface TickData {
  symbol: string;
  bid: number;
  ask: number;
  /** Unix ms timestamp */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// AI Signal (Python Brain output)
// ---------------------------------------------------------------------------

export type SignalDirection = "BUY" | "SELL" | "HOLD";

export interface AiSignal {
  id: string;
  symbol: string;
  direction: SignalDirection;
  /** Model confidence 0–1 */
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  /** ISO-8601 string */
  generatedAt: string;
  /** Human-readable rationale */
  rationale?: string;
}

// ---------------------------------------------------------------------------
// Order / Trade execution (Java Executor output)
// ---------------------------------------------------------------------------

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP";
export type OrderStatus =
  | "PENDING"
  | "FILLED"
  | "PARTIALLY_FILLED"
  | "CANCELLED"
  | "REJECTED";

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  units: number;
  price?: number;   // required for LIMIT/STOP
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  filledUnits?: number;
  averagePrice?: number;
  message?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// WebSocket message envelope
// ---------------------------------------------------------------------------

export type WsMessageType =
  | "TICK"
  | "OHLC_UPDATE"
  | "AI_SIGNAL"
  | "ORDER_UPDATE"
  | "ERROR"
  | "HEARTBEAT";

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
}

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
