use thiserror::Error;

#[derive(Debug, Error)]
pub enum FaydaError {
    #[error("Config error: {0}")]
    Config(String),

    #[error("Auth error: {0}")]
    Auth(String),

    #[error("Token error [{code}]: {message}")]
    Token { message: String, code: String },

    #[error("Invalid assertion: {0}")]
    InvalidAssertion(String),

    #[error("Invalid transaction: {0}")]
    InvalidTransaction(String),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("UserInfo error: {0}")]
    UserInfo(String),

    #[error("Sandbox error: {0}")]
    Sandbox(String),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),
}

pub fn map_token_error(code: &str, message: &str) -> FaydaError {
    match code {
        "invalid_assertion" => FaydaError::InvalidAssertion(message.to_string()),
        "invalid_transaction" => FaydaError::InvalidTransaction(message.to_string()),
        "invalid_request" => FaydaError::InvalidRequest(message.to_string()),
        _ => FaydaError::Token {
            message: message.to_string(),
            code: code.to_string(),
        },
    }
}
