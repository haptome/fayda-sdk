use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaydaTokens {
    pub access_token: String,
    pub id_token: String,
    pub token_type: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FaydaAddress {
    pub formatted: Option<String>,
    pub street_address: Option<String>,
    pub locality: Option<String>,
    pub region: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FaydaUser {
    pub sub: String,
    pub name: Option<String>,
    pub name_am: Option<String>,
    pub name_en: Option<String>,
    pub email: Option<String>,
    pub phone_number: Option<String>,
    pub picture: Option<String>,
    pub gender: Option<String>,
    pub birthdate: Option<String>,
    pub address: Option<FaydaAddress>,
}

#[derive(Debug, Clone)]
pub struct AuthorizationResult {
    pub url: String,
    pub state: String,
    pub code_verifier: String,
}

#[derive(Debug, Clone)]
pub struct GetFromCodeParams {
    pub code: String,
    pub state: String,
    pub expected_state: String,
    pub code_verifier: String,
}
