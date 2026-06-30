use crate::errors::FaydaError;
use crate::DEFAULT_BASE_URL;

#[derive(Debug, Clone)]
pub struct FaydaConfig {
    pub client_id: String,
    pub private_key_base64: String,
    pub redirect_uri: String,
    pub sandbox: bool,
    pub acr_values: Option<String>,
    pub scopes: Vec<String>,
    pub claims_locales: String,
    pub base_url: String,
}

impl FaydaConfig {
    pub fn authorization_endpoint(&self) -> String {
        format!("{}/authorize", self.base_url)
    }

    pub fn token_endpoint(&self) -> String {
        format!("{}/v1/esignet/oauth/token", self.base_url)
    }

    pub fn userinfo_endpoint(&self) -> String {
        format!("{}/v1/esignet/oidc/userinfo", self.base_url)
    }

    pub fn discovery_endpoint(&self) -> String {
        format!(
            "{}/v1/esignet/oauth/.well-known/openid-configuration",
            self.base_url
        )
    }
}

#[derive(Default)]
pub struct FaydaClientBuilder {
    client_id: Option<String>,
    private_key_base64: Option<String>,
    redirect_uri: Option<String>,
    sandbox: bool,
    acr_values: Option<String>,
    scopes: Option<Vec<String>>,
    claims_locales: Option<String>,
}

impl FaydaClientBuilder {
    pub fn client_id(mut self, id: impl Into<String>) -> Self {
        self.client_id = Some(id.into());
        self
    }

    pub fn private_key_base64(mut self, key: impl Into<String>) -> Self {
        self.private_key_base64 = Some(key.into());
        self
    }

    pub fn redirect_uri(mut self, uri: impl Into<String>) -> Self {
        self.redirect_uri = Some(uri.into());
        self
    }

    pub fn sandbox(mut self, sandbox: bool) -> Self {
        self.sandbox = sandbox;
        self
    }

    pub fn acr_values(mut self, acr: impl Into<String>) -> Self {
        self.acr_values = Some(acr.into());
        self
    }

    pub fn scopes(mut self, scopes: Vec<String>) -> Self {
        self.scopes = Some(scopes);
        self
    }

    pub fn claims_locales(mut self, locales: impl Into<String>) -> Self {
        self.claims_locales = Some(locales.into());
        self
    }

    pub fn build(self) -> Result<FaydaConfig, FaydaError> {
        let client_id = self
            .client_id
            .ok_or_else(|| FaydaError::Config("client_id required".into()))?;
        let private_key_base64 = self
            .private_key_base64
            .ok_or_else(|| FaydaError::Config("private_key_base64 required".into()))?;
        let redirect_uri = self
            .redirect_uri
            .ok_or_else(|| FaydaError::Config("redirect_uri required".into()))?;

        Ok(FaydaConfig {
            client_id,
            private_key_base64,
            redirect_uri,
            sandbox: self.sandbox,
            acr_values: self.acr_values,
            scopes: self.scopes.unwrap_or_else(|| {
                vec![
                    "openid".to_string(),
                    "profile".to_string(),
                    "email".to_string(),
                ]
            }),
            claims_locales: self.claims_locales.unwrap_or_else(|| "en".to_string()),
            base_url: DEFAULT_BASE_URL.to_string(),
        })
    }
}
