use crate::{auth::Auth, config::FaydaConfig, errors::FaydaError, models::*, token::Token};
use base64::Engine;

pub struct UserInfo {
    config: FaydaConfig,
}

impl UserInfo {
    pub fn new(config: FaydaConfig) -> Self {
        UserInfo { config }
    }

    /// Fetch user information using an access token
    pub async fn get(&self, access_token: &str) -> Result<FaydaUser, FaydaError> {
        if self.config.sandbox {
            return Ok(mock_user());
        }

        let client = reqwest::Client::new();
        let response = client
            .get(self.config.userinfo_endpoint())
            .header("Authorization", format!("Bearer {}", access_token))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(FaydaError::UserInfo(format!(
                "UserInfo request failed: {}",
                response.status()
            )));
        }

        // Response is a signed JWT — decode payload without signature verification
        let jwt_text = response.text().await?;
        let claims = decode_jwt_payload(&jwt_text)?;
        Ok(map_claims_to_user(&claims))
    }

    /// Convenience method: validate callback → exchange code → fetch user
    pub async fn get_from_code(
        &self,
        params: GetFromCodeParams,
        auth: &Auth,
        token: &Token,
    ) -> Result<FaydaUser, FaydaError> {
        auth.validate_callback(&params.state, &params.expected_state)?;
        let tokens = token.exchange(&params.code, &params.code_verifier).await?;
        self.get(&tokens.access_token).await
    }

    /// Return mock user (sandbox mode only)
    pub fn get_mock(&self) -> Result<FaydaUser, FaydaError> {
        if !self.config.sandbox {
            return Err(FaydaError::Sandbox(
                "get_mock() is only available in sandbox mode".into(),
            ));
        }
        Ok(mock_user())
    }
}

fn decode_jwt_payload(jwt: &str) -> Result<serde_json::Value, FaydaError> {
    let parts: Vec<&str> = jwt.split('.').collect();
    if parts.len() != 3 {
        return Err(FaydaError::UserInfo("invalid JWT format".into()));
    }
    let payload_bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|e| FaydaError::UserInfo(format!("JWT base64 decode error: {}", e)))?;
    let claims: serde_json::Value = serde_json::from_slice(&payload_bytes)?;
    Ok(claims)
}

fn map_claims_to_user(claims: &serde_json::Value) -> FaydaUser {
    let address = claims.get("address").map(|a| FaydaAddress {
        formatted: a
            .get("formatted")
            .and_then(|v| v.as_str())
            .map(String::from),
        street_address: a
            .get("street_address")
            .and_then(|v| v.as_str())
            .map(String::from),
        locality: a.get("locality").and_then(|v| v.as_str()).map(String::from),
        region: a.get("region").and_then(|v| v.as_str()).map(String::from),
        country: a.get("country").and_then(|v| v.as_str()).map(String::from),
    });

    FaydaUser {
        sub: claims["sub"].as_str().unwrap_or("").to_string(),
        name: claims
            .get("name")
            .and_then(|v| v.as_str())
            .map(String::from),
        name_am: claims
            .get("name#am")
            .and_then(|v| v.as_str())
            .map(String::from),
        name_en: claims
            .get("name#en")
            .and_then(|v| v.as_str())
            .map(String::from),
        email: claims
            .get("email")
            .and_then(|v| v.as_str())
            .map(String::from),
        phone_number: claims
            .get("phone_number")
            .and_then(|v| v.as_str())
            .map(String::from),
        picture: claims
            .get("picture")
            .and_then(|v| v.as_str())
            .map(String::from),
        gender: claims
            .get("gender")
            .and_then(|v| v.as_str())
            .map(String::from),
        birthdate: claims
            .get("birthdate")
            .and_then(|v| v.as_str())
            .map(String::from),
        address,
    }
}

fn mock_user() -> FaydaUser {
    FaydaUser {
        sub: "mock-fayda-id-000001".to_string(),
        name: Some("Abebe Bikila".to_string()),
        name_am: Some("አበበ ቢኪላ".to_string()),
        name_en: Some("Abebe Bikila".to_string()),
        email: Some("abebe.bikila@example.com".to_string()),
        phone_number: Some("+251911000000".to_string()),
        picture: Some("https://placehold.co/150x150?text=AB".to_string()),
        gender: Some("male".to_string()),
        birthdate: Some("1932-08-07".to_string()),
        address: Some(FaydaAddress {
            formatted: Some("Addis Ababa, Ethiopia".to_string()),
            locality: Some("Addis Ababa".to_string()),
            country: Some("ET".to_string()),
            ..Default::default()
        }),
    }
}
