//! Shared application error type.
//!
//! All Tauri command handlers return `Result<T, AppError>`.
//! `AppError` implements `serde::Serialize` so Tauri can pass it to the
//! frontend as a JSON object.

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum AppError {
    #[error("HTTP error: {0}")]
    Http(String),

    #[error("Serialisation error: {0}")]
    Serialisation(String),

    #[error("Backend unavailable: {message}")]
    BackendUnavailable { message: String },

    #[error("Invalid request: {message}")]
    InvalidRequest { message: String },

    #[error("Credential error: {0}")]
    Credential(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_connect() || err.is_timeout() {
            AppError::BackendUnavailable {
                message: err.to_string(),
            }
        } else {
            AppError::Http(err.to_string())
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialisation(err.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}
