//! Axum middleware helpers for fayda-sdk.
//!
//! # Quick start
//!
//! ```rust,no_run
//! use axum::{middleware, Router};
//! use fayda_sdk::middleware::require_fayda_auth;
//!
//! let protected = Router::new()
//!     .route("/dashboard", axum::routing::get(dashboard))
//!     .route_layer(middleware::from_fn(require_fayda_auth));
//! ```
//!
//! Your session layer (e.g. `tower-sessions`) must insert a `FaydaSessionUser`
//! into request extensions before `require_fayda_auth` runs.

use crate::models::FaydaUser;
use axum::{
    body::Body,
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};

/// A lightweight session struct stored in request extensions by your session layer.
/// Only contains the fields needed across requests — full FaydaUser is re-fetched as needed.
#[derive(Debug, Clone)]
pub struct FaydaSessionUser {
    pub sub: String,
    pub name: Option<String>,
    pub name_am: Option<String>,
    pub email: Option<String>,
    pub phone_number: Option<String>,
    pub picture: Option<String>,
}

impl From<&FaydaUser> for FaydaSessionUser {
    fn from(u: &FaydaUser) -> Self {
        FaydaSessionUser {
            sub: u.sub.clone(),
            name: u.name.clone(),
            name_am: u.name_am.clone(),
            email: u.email.clone(),
            phone_number: u.phone_number.clone(),
            picture: u.picture.clone(),
        }
    }
}

/// Axum middleware that returns 401 if `FaydaSessionUser` is not in request extensions.
///
/// Wire up your session layer to insert `FaydaSessionUser` into extensions before this runs.
pub async fn require_fayda_auth(request: Request, next: Next) -> Result<Response, StatusCode> {
    if request.extensions().get::<FaydaSessionUser>().is_none() {
        return Err(StatusCode::UNAUTHORIZED);
    }
    Ok(next.run(request).await)
}

/// Axum middleware that redirects to `login_path` if `FaydaSessionUser` is absent.
pub fn require_fayda_auth_redirect(
    login_path: &'static str,
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone {
    move |request: Request, next: Next| {
        Box::pin(async move {
            if request.extensions().get::<FaydaSessionUser>().is_none() {
                return axum::response::Redirect::to(login_path).into_response();
            }
            next.run(request).await
        })
    }
}
