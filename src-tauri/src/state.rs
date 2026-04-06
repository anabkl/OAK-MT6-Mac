//! Tauri managed state — a single `reqwest::Client` and service base URLs
//! so that command handlers share an HTTP connection pool.

use reqwest::Client;

/// URLs for the local Docker microservices.
/// In production, override via environment variables before building.
pub struct ServiceUrls {
    /// Python Brain (FastAPI) base URL — default: http://localhost:8000
    pub brain: String,
    /// Java Executor (Spring Boot) base URL — default: http://localhost:8080
    pub executor: String,
}

impl Default for ServiceUrls {
    fn default() -> Self {
        Self {
            brain: std::env::var("BRAIN_URL")
                .unwrap_or_else(|_| "http://localhost:8000".into()),
            executor: std::env::var("EXECUTOR_URL")
                .unwrap_or_else(|_| "http://localhost:8080".into()),
        }
    }
}

/// Tauri managed application state.
pub struct AppState {
    pub http: Client,
    pub urls: ServiceUrls,
}

impl AppState {
    pub fn new() -> Self {
        let http = Client::builder()
            // Prefer rustls over native-tls for security and consistency.
            .use_rustls_tls()
            // Short timeouts — the local Docker services should be fast.
            .connect_timeout(std::time::Duration::from_secs(5))
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to build reqwest client");

        Self {
            http,
            urls: ServiceUrls::default(),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
