//! Fayda SDK for Rust
//!
//! A Rust SDK for Ethiopia's Fayda National Digital ID (eSignet).
//!
//! See the Python implementation at `packages/python/` for reference logic.
//! This Rust version follows the same API contract but uses idiomatic Rust patterns.

pub mod auth;
pub mod client;
pub mod config;
pub mod errors;
#[cfg(feature = "axum")]
pub mod middleware;
pub mod models;
pub mod token;
pub mod userinfo;
mod tests;

pub use client::FaydaClient;
pub use config::{FaydaConfig, FaydaClientBuilder};
pub use errors::FaydaError;
pub use models::{AuthorizationResult, FaydaTokens, FaydaUser, GetFromCodeParams};

pub const DEFAULT_BASE_URL: &str = "https://esignet.ida.et";
