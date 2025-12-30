//! Continuum Desktop Application Entry Point
//!
//! This binary crate is the entry point for the Tauri application.
//! All functionality is implemented in the `app_lib` crate.

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}
