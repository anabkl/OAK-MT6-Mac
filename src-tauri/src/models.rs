//! Trading domain models shared across command modules.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// OHLCV bar
// ---------------------------------------------------------------------------

/// A single OHLCV candlestick bar — mirrors the frontend `OhlcBar` type.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OhlcBar {
    /// Unix timestamp in **seconds** (lightweight-charts requirement).
    pub time: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    /// Volume may be zero if the broker feed does not supply it.
    #[serde(default)]
    pub volume: f64,
}

// ---------------------------------------------------------------------------
// AI Signal
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SignalDirection {
    Buy,
    Sell,
    Hold,
}

/// AI signal emitted by the Python Brain (FastAPI + LSTM model).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSignal {
    pub id: String,
    pub symbol: String,
    pub direction: SignalDirection,
    /// Model confidence 0.0–1.0.
    pub confidence: f64,
    pub entry_price: f64,
    pub stop_loss: f64,
    pub take_profit: f64,
    pub generated_at: String,
    pub rationale: Option<String>,
}

// ---------------------------------------------------------------------------
// Order / Execution
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderSide {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderType {
    Market,
    Limit,
    Stop,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderRequest {
    pub symbol: String,
    pub side: OrderSide,
    #[serde(rename = "type")]
    pub order_type: OrderType,
    pub units: i64,
    pub price: Option<f64>,
    pub stop_loss: Option<f64>,
    pub take_profit: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderStatus {
    Pending,
    Filled,
    PartiallyFilled,
    Cancelled,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderResponse {
    pub order_id: String,
    pub status: OrderStatus,
    pub filled_units: Option<i64>,
    pub average_price: Option<f64>,
    pub message: Option<String>,
    pub timestamp: String,
}

/// Open position returned by `get_open_positions`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Position {
    pub position_id: String,
    pub symbol: String,
    pub side: OrderSide,
    pub units: i64,
    pub average_price: f64,
    pub unrealized_pl: f64,
    pub opened_at: String,
}
