//! Commands that communicate with the Python Brain microservice (FastAPI).
//!
//! Endpoints (subject to your FastAPI route definitions):
//!   GET  /api/signal/{symbol}          → latest AI signal
//!   GET  /api/ohlc/{symbol}?count=N&granularity=M5  → historical OHLCV bars

use tauri::State;
use tracing::{debug, error, instrument};

use crate::error::AppError;
use crate::models::{AiSignal, OhlcBar};
use crate::state::AppState;

// ---------------------------------------------------------------------------
// fetch_ai_signal
// ---------------------------------------------------------------------------

/// Fetch the latest AI trading signal for `symbol` from the Python Brain.
///
/// The Tauri frontend calls this via:
/// ```ts
/// import { invoke } from "@tauri-apps/api/tauri";
/// const signal = await invoke<AiSignal>("fetch_ai_signal", { symbol: "EUR_USD" });
/// ```
#[tauri::command]
#[instrument(skip(state), fields(symbol = %symbol))]
pub async fn fetch_ai_signal(
    symbol: String,
    state: State<'_, AppState>,
) -> Result<AiSignal, AppError> {
    let url = format!("{}/api/signal/{}", state.urls.brain, symbol);
    debug!(%url, "Fetching AI signal");

    let response = state
        .http
        .get(&url)
        .send()
        .await
        .map_err(|err| {
            error!(%err, "Failed to reach Python Brain");
            AppError::from(err)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!(%status, %body, "Python Brain returned an error");
        return Err(AppError::BackendUnavailable {
            message: format!("Brain returned {status}: {body}"),
        });
    }

    let signal: AiSignal = response.json().await.map_err(|err| {
        error!(%err, "Failed to deserialise AI signal");
        AppError::Serialisation(err.to_string())
    })?;

    debug!(signal_id = %signal.id, "AI signal received");
    Ok(signal)
}

// ---------------------------------------------------------------------------
// fetch_ohlc_history
// ---------------------------------------------------------------------------

/// Fetch historical OHLCV bars for `symbol` from the Python Brain.
///
/// `granularity` follows the OANDA convention: S5, S10, M1, M5, M15, H1, …
#[tauri::command]
#[instrument(skip(state), fields(symbol = %symbol, count = count, granularity = %granularity))]
pub async fn fetch_ohlc_history(
    symbol: String,
    count: u32,
    granularity: String,
    state: State<'_, AppState>,
) -> Result<Vec<OhlcBar>, AppError> {
    let url = format!(
        "{}/api/ohlc/{}?count={}&granularity={}",
        state.urls.brain, symbol, count, granularity
    );
    debug!(%url, "Fetching OHLC history");

    let response = state
        .http
        .get(&url)
        .send()
        .await
        .map_err(|err| {
            error!(%err, "Failed to reach Python Brain for OHLC");
            AppError::from(err)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!(%status, %body, "Python Brain OHLC endpoint returned an error");
        return Err(AppError::BackendUnavailable {
            message: format!("Brain returned {status}: {body}"),
        });
    }

    let bars: Vec<OhlcBar> = response.json().await.map_err(|err| {
        error!(%err, "Failed to deserialise OHLC bars");
        AppError::Serialisation(err.to_string())
    })?;

    debug!(bar_count = bars.len(), "OHLC history received");
    Ok(bars)
}
