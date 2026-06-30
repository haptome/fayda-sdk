use crate::{config::FaydaConfig, errors::FaydaError, models::AuthorizationResult};
use base64::Engine;
use constant_time_eq::constant_time_eq;
use rand::RngCore;
use sha2::{Digest, Sha256};

const BASE64: base64::engine::general_purpose::GeneralPurpose =
    base64::engine::general_purpose::URL_SAFE_NO_PAD;

pub struct Auth {
    config: FaydaConfig,
}

impl Auth {
    pub fn new(config: FaydaConfig) -> Self {
        Auth { config }
    }

    pub async fn get_authorization_url(
        &self,
        claims: Option<serde_json::Value>,
    ) -> Result<AuthorizationResult, FaydaError> {
        let mut verifier_bytes = vec![0u8; 64];
        rand::thread_rng().fill_bytes(&mut verifier_bytes);
        let code_verifier = BASE64.encode(&verifier_bytes);

        let mut hasher = Sha256::new();
        hasher.update(code_verifier.as_bytes());
        let code_challenge = BASE64.encode(hasher.finalize());

        let mut state_bytes = vec![0u8; 32];
        rand::thread_rng().fill_bytes(&mut state_bytes);
        let state = BASE64.encode(state_bytes);

        let scope = self.config.scopes.join(" ");
        let mut params = vec![
            ("response_type", "code"),
            ("client_id", &self.config.client_id),
            ("redirect_uri", &self.config.redirect_uri),
            ("scope", &scope),
            ("code_challenge", &code_challenge),
            ("code_challenge_method", "S256"),
            ("state", &state),
        ];

        if let Some(acr) = &self.config.acr_values {
            params.push(("acr_values", acr));
        }

        let mut url = format!("{}?", self.config.authorization_endpoint());
        for (i, (k, v)) in params.iter().enumerate() {
            if i > 0 {
                url.push('&');
            }
            url.push_str(&format!("{}={}", k, urlencoding::encode(v)));
        }

        if let Some(claims_obj) = claims {
            let claims_str = serde_json::to_string(&claims_obj)?;
            url.push_str(&format!("&claims={}", urlencoding::encode(&claims_str)));
        }

        Ok(AuthorizationResult {
            url,
            state,
            code_verifier,
        })
    }

    pub fn validate_callback(
        &self,
        callback_state: &str,
        expected_state: &str,
    ) -> Result<(), FaydaError> {
        if !constant_time_eq(callback_state.as_bytes(), expected_state.as_bytes()) {
            return Err(FaydaError::Auth(
                "state mismatch — possible CSRF attack".into(),
            ));
        }
        Ok(())
    }
}
