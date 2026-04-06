//! Commands that communicate with the Java Executor microservice (Spring Boot).
//!
//! Endpoints (subject to your Spring Boot controller definitions):
//!   POST /api/orders               → place a new order
//!   GET  /api/orders/open          → list open positions
//!   DELETE /api/orders/{order_id}  → cancel a pending order

use tauri::State;
use tracing::{debug, error, instrument};

use crate::error::AppError;
use crate::models::{OrderRequest, OrderResponse, Position};
use crate::state::AppState;

// ---------------------------------------------------------------------------
// execute_order
// ---------------------------------------------------------------------------

/// Place a trade order via the Java Executor.
///
/// The Tauri frontend calls this via:
/// ```ts
/// import { invoke } from "@tauri-apps/api/tauri";
/// const result = await invoke<OrderResponse>("execute_order", { request });
/// ```
#[tauri::command]
#[instrument(skip(state, request), fields(
    symbol = %request.symbol,
    side   = ?request.side,
    units  = request.units,
))]
pub async fn execute_order(
    request: OrderRequest,
    state: State<'_, AppState>,
) -> Result<OrderResponse, AppError> {
    // Basic validation before hitting the network
    if request.units <= 0 {
        return Err(AppError::InvalidRequest {
            message: "Units must be > 0".into(),
        });
    }

    let url = format!("{}/api/orders", state.urls.executor);
    debug!(%url, "Sending order to Java Executor");

    let response = state
        .http
        .post(&url)
        .json(&request)
        .send()
        .await
        .map_err(|err| {
            error!(%err, "Failed to reach Java Executor");
            AppError::from(err)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!(%status, %body, "Java Executor returned an error for order");
        return Err(AppError::BackendUnavailable {
            message: format!("Executor returned {status}: {body}"),
        });
    }

    let order: OrderResponse = response.json().await.map_err(|err| {
        error!(%err, "Failed to deserialise OrderResponse");
        AppError::Serialisation(err.to_string())
    })?;

    debug!(order_id = %order.order_id, status = ?order.status, "Order response received");
    Ok(order)
}

// ---------------------------------------------------------------------------
// get_open_positions
// ---------------------------------------------------------------------------

/// Retrieve all currently open positions from the Java Executor.
#[tauri::command]
#[instrument(skip(state))]
pub async fn get_open_positions(
    state: State<'_, AppState>,
) -> Result<Vec<Position>, AppError> {
    let url = format!("{}/api/orders/open", state.urls.executor);
    debug!(%url, "Fetching open positions");

    let response = state
        .http
        .get(&url)
        .send()
        .await
        .map_err(|err| {
            error!(%err, "Failed to reach Java Executor for positions");
            AppError::from(err)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!(%status, %body, "Java Executor positions endpoint error");
        return Err(AppError::BackendUnavailable {
            message: format!("Executor returned {status}: {body}"),
        });
    }

    let positions: Vec<Position> = response.json().await.map_err(|err| {
        error!(%err, "Failed to deserialise positions");
        AppError::Serialisation(err.to_string())
    })?;

    debug!(count = positions.len(), "Open positions received");
    Ok(positions)
}

// ---------------------------------------------------------------------------
// cancel_order
// ---------------------------------------------------------------------------

/// Cancel a pending (unfilled) order by its ID.
#[tauri::command]
#[instrument(skip(state), fields(order_id = %order_id))]
pub async fn cancel_order(
    order_id: String,
    state: State<'_, AppState>,
) -> Result<OrderResponse, AppError> {
    if order_id.trim().is_empty() {
        return Err(AppError::InvalidRequest {
            message: "order_id must not be empty".into(),
        });
    }

    let url = format!("{}/api/orders/{}", state.urls.executor, order_id);
    debug!(%url, "Cancelling order via Java Executor");

    let response = state
        .http
        .delete(&url)
        .send()
        .await
        .map_err(|err| {
            error!(%err, "Failed to reach Java Executor for cancellation");
            AppError::from(err)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!(%status, %body, "Java Executor cancel endpoint error");
        return Err(AppError::BackendUnavailable {
            message: format!("Executor returned {status}: {body}"),
        });
    }

    let order: OrderResponse = response.json().await.map_err(|err| {
        error!(%err, "Failed to deserialise cancel response");
        AppError::Serialisation(err.to_string())
    })?;

    debug!(order_id = %order.order_id, "Order cancelled");
    Ok(order)
}
