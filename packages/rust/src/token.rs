use crate::{config::FaydaConfig, errors::FaydaError, models::FaydaTokens};
use base64::Engine;
use jsonwebtoken::{
    decode, decode_header, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation,
};
use rsa::{pkcs8::EncodePrivateKey, BigUint, RsaPrivateKey};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub struct Token {
    config: FaydaConfig,
}

#[derive(Serialize, Deserialize)]
struct ClientAssertionClaims {
    iss: String,
    sub: String,
    aud: String,
    iat: u64,
    exp: u64,
    jti: String,
}

impl Token {
    pub fn new(config: FaydaConfig) -> Self {
        Token { config }
    }

    fn build_client_assertion(&self) -> Result<String, FaydaError> {
        use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};

        // Decode base64-encoded JWK string
        let jwk_bytes = STANDARD
            .decode(&self.config.private_key_base64)
            .map_err(|e| FaydaError::Config(format!("base64 decode error: {}", e)))?;

        let jwk: serde_json::Value = serde_json::from_slice(&jwk_bytes)?;

        // Decode a base64url JWK field to BigUint
        let decode_field = |field: &str| -> Result<BigUint, FaydaError> {
            let b64 = jwk[field]
                .as_str()
                .ok_or_else(|| FaydaError::Config(format!("JWK missing field: {}", field)))?;
            let bytes = URL_SAFE_NO_PAD
                .decode(b64)
                .map_err(|e| FaydaError::Config(format!("base64 decode '{}': {}", field, e)))?;
            Ok(BigUint::from_bytes_be(&bytes))
        };

        let n = decode_field("n")?;
        let e_val = decode_field("e")?;
        let d = decode_field("d")?;
        let p = decode_field("p")?;
        let q = decode_field("q")?;

        let rsa_key = RsaPrivateKey::from_components(n, e_val, d, vec![p, q])
            .map_err(|e| FaydaError::Config(format!("RSA key construction error: {}", e)))?;

        let pem = rsa_key
            .to_pkcs8_pem(rsa::pkcs8::LineEnding::LF)
            .map_err(|e| FaydaError::Config(format!("PEM encoding error: {}", e)))?;

        let encoding_key = EncodingKey::from_rsa_pem(pem.as_bytes())
            .map_err(|e| FaydaError::Config(format!("EncodingKey error: {}", e)))?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| FaydaError::Config(format!("system time error: {}", e)))?
            .as_secs();

        let claims = ClientAssertionClaims {
            iss: self.config.client_id.clone(),
            sub: self.config.client_id.clone(),
            aud: self.config.token_endpoint(),
            iat: now,
            exp: now + 7200,
            jti: Uuid::new_v4().to_string(),
        };

        let header = Header::new(Algorithm::RS256);
        encode(&header, &claims, &encoding_key).map_err(FaydaError::Jwt)
    }

    /// Exchange authorization code for tokens
    pub async fn exchange(
        &self,
        code: &str,
        code_verifier: &str,
    ) -> Result<FaydaTokens, FaydaError> {
        if self.config.sandbox {
            return Ok(FaydaTokens {
                access_token: "mock-access-token-abc123def456".to_string(),
                id_token: "mock-id-token-xyz789uvw012".to_string(),
                token_type: "Bearer".to_string(),
                expires_in: 3600,
            });
        }

        let assertion = self.build_client_assertion()?;

        let params = [
            ("grant_type", "authorization_code"),
            ("client_id", self.config.client_id.as_str()),
            ("code", code),
            ("redirect_uri", self.config.redirect_uri.as_str()),
            ("code_verifier", code_verifier),
            (
                "client_assertion_type",
                "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            ),
            ("client_assertion", assertion.as_str()),
        ];

        let client = reqwest::Client::new();
        let response = client
            .post(self.config.token_endpoint())
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_body: serde_json::Value = response.json().await?;
            let error_code = error_body["error"].as_str().unwrap_or("").to_string();
            let description = error_body["error_description"]
                .as_str()
                .unwrap_or("")
                .to_string();
            return Err(crate::errors::map_token_error(&error_code, &description));
        }

        let tokens: FaydaTokens = response.json().await?;
        Ok(tokens)
    }

    /// Verify an ID token's RS256 signature against Fayda's public JWKS.
    /// Returns the decoded claims as a JSON map on success.
    pub async fn verify(&self, id_token: &str) -> Result<HashMap<String, Value>, FaydaError> {
        // Extract kid from token header (optional — used to select the right key)
        let kid = decode_header(id_token).ok().and_then(|h| h.kid);

        let http = reqwest::Client::new();

        // Fetch discovery document → jwks_uri
        let discovery: Value = http
            .get(self.config.discovery_endpoint())
            .send()
            .await?
            .json()
            .await?;

        let jwks_uri = discovery["jwks_uri"]
            .as_str()
            .ok_or_else(|| FaydaError::Config("jwks_uri not found in discovery document".into()))?;

        // Fetch JWKS
        let jwks: Value = http.get(jwks_uri).send().await?.json().await?;

        let keys = jwks["keys"]
            .as_array()
            .ok_or_else(|| FaydaError::Config("JWKS missing keys array".into()))?;

        // Find the matching key (by kid if present, otherwise first RSA key)
        let key_json = keys
            .iter()
            .find(|k| {
                if let Some(ref kid_val) = kid {
                    k["kid"].as_str() == Some(kid_val.as_str())
                } else {
                    k["kty"].as_str() == Some("RSA")
                }
            })
            .ok_or_else(|| FaydaError::Config("No matching RSA key found in JWKS".into()))?;

        let n = key_json["n"]
            .as_str()
            .ok_or_else(|| FaydaError::Config("JWK missing 'n'".into()))?;
        let e = key_json["e"]
            .as_str()
            .ok_or_else(|| FaydaError::Config("JWK missing 'e'".into()))?;

        let decoding_key = DecodingKey::from_rsa_components(n, e).map_err(FaydaError::Jwt)?;

        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_audience(&[self.config.client_id.as_str()]);

        let token_data = decode::<HashMap<String, Value>>(id_token, &decoding_key, &validation)
            .map_err(FaydaError::Jwt)?;

        Ok(token_data.claims)
    }
}
