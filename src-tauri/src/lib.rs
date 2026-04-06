//! Library root — exposes all modules and the `run()` entry point used by
//! both `main.rs` (binary) and integration tests.

pub mod commands;
pub mod error;
pub mod models;
pub mod state;

use tauri::{Manager, SystemTray, SystemTrayMenu, CustomMenuItem, SystemTrayEvent};
use tracing_subscriber::{fmt, EnvFilter};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

pub fn run() {
    // Initialise structured logging (respects RUST_LOG env var).
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(false)
        .compact()
        .init();

    tracing::info!("Starting Lahra-MT6-Pro");

    // ── System tray ──────────────────────────────────────────────────────────
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show Terminal");
    let tray_menu = SystemTrayMenu::new().add_item(show).add_item(quit);
    let tray = SystemTray::new().with_menu(tray_menu);

    // ── Tauri app ─────────────────────────────────────────────────────────────
    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(|app, event| {
            if let SystemTrayEvent::MenuItemClick { id, .. } = event {
                match id.as_str() {
                    "quit" => std::process::exit(0),
                    "show" => {
                        if let Some(window) = app.get_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                }
            }
        })
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::brain::fetch_ai_signal,
            commands::brain::fetch_ohlc_history,
            commands::executor::execute_order,
            commands::executor::get_open_positions,
            commands::executor::cancel_order,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lahra-MT6-Pro");
}
