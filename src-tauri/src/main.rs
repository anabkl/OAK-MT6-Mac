//! Lahra-MT6-Pro — Tauri application entry point.
//!
//! Initialises tracing, builds the Tauri app with all registered commands,
//! and sets up the system tray.

// Re-export the library crate so that integration tests can use it.
pub use lahra_mt6_pro_lib::*;

fn main() {
    lahra_mt6_pro_lib::run();
}
