/// Rust/Axum example: Login with Fayda ID
///
/// [dependencies]
/// fayda-sdk = { path = "../../packages/rust" }
/// axum = "0.7"
/// tokio = { version = "1", features = ["full"] }
/// tower-sessions = "0.12"
/// serde = { version = "1", features = ["derive"] }
/// serde_json = "1"
/// tower = "0.4"
use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect, Response},
    routing::get,
    Json, Router,
};
use fayda_sdk::FaydaClient;
use tower_sessions::{MemoryStore, Session, SessionManagerLayer};

#[derive(Clone)]
struct AppState {
    fayda: Arc<FaydaClient>,
}

#[tokio::main]
async fn main() {
    let client = FaydaClient::builder()
        .client_id(std::env::var("FAYDA_CLIENT_ID").expect("FAYDA_CLIENT_ID required"))
        .private_key_base64(
            std::env::var("FAYDA_PRIVATE_KEY_B64").expect("FAYDA_PRIVATE_KEY_B64 required"),
        )
        .redirect_uri("http://localhost:3000/auth/callback")
        .build()
        .expect("Failed to build FaydaClient");

    let state = AppState {
        fayda: Arc::new(client),
    };

    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store);

    let app = Router::new()
        .route("/login", get(login_handler))
        .route("/auth/callback", get(callback_handler))
        .route("/profile", get(profile_handler))
        .route("/logout", get(logout_handler))
        .with_state(state)
        .layer(session_layer);

    println!("Listening on http://localhost:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn login_handler(
    State(state): State<AppState>,
    session: Session,
) -> Result<Redirect, Response> {
    let result = state
        .fayda
        .auth
        .get_authorization_url(Some(serde_json::json!({
            "userinfo": { "name": { "essential": true } }
        })))
        .await
        .map_err(|e| {
            (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        })?;

    session.insert("fayda_state", &result.state).await.ok();
    session
        .insert("fayda_code_verifier", &result.code_verifier)
        .await
        .ok();

    Ok(Redirect::to(&result.url))
}

async fn callback_handler(
    State(state): State<AppState>,
    session: Session,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Redirect, Response> {
    if let Some(error) = params.get("error") {
        return Err((axum::http::StatusCode::BAD_REQUEST, error.clone()).into_response());
    }

    let code = params
        .get("code")
        .ok_or_else(|| {
            (axum::http::StatusCode::BAD_REQUEST, "missing code").into_response()
        })?
        .clone();

    let callback_state = params
        .get("state")
        .ok_or_else(|| {
            (axum::http::StatusCode::BAD_REQUEST, "missing state").into_response()
        })?
        .clone();

    let expected_state: String = session
        .remove("fayda_state")
        .await
        .ok()
        .flatten()
        .ok_or_else(|| {
            (axum::http::StatusCode::BAD_REQUEST, "session expired").into_response()
        })?;

    let code_verifier: String = session
        .remove("fayda_code_verifier")
        .await
        .ok()
        .flatten()
        .ok_or_else(|| {
            (axum::http::StatusCode::BAD_REQUEST, "session expired").into_response()
        })?;

    state
        .fayda
        .auth
        .validate_callback(&callback_state, &expected_state)
        .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response())?;

    let tokens = state
        .fayda
        .token
        .exchange(&code, &code_verifier)
        .await
        .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response())?;

    let user = state
        .fayda
        .userinfo
        .get(&tokens.access_token)
        .await
        .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response())?;

    session
        .insert("fayda_user_sub", &user.sub)
        .await
        .ok();
    session
        .insert("fayda_user_name", &user.name)
        .await
        .ok();

    Ok(Redirect::to("/profile"))
}

async fn profile_handler(session: Session) -> Result<Json<serde_json::Value>, Redirect> {
    let sub: Option<String> = session.get("fayda_user_sub").await.ok().flatten();
    if sub.is_none() {
        return Err(Redirect::to("/login"));
    }
    let name: Option<String> = session.get("fayda_user_name").await.ok().flatten();

    Ok(Json(serde_json::json!({
        "sub": sub,
        "name": name,
        "message": "Logged in with Fayda ID"
    })))
}

async fn logout_handler(session: Session) -> Redirect {
    session.flush().await.ok();
    Redirect::to("/")
}
