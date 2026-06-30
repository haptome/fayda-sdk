use crate::{
    auth::Auth,
    config::{FaydaClientBuilder, FaydaConfig},
    token::Token,
    userinfo::UserInfo,
};

/// Main Fayda SDK client
pub struct FaydaClient {
    pub auth: Auth,
    pub token: Token,
    pub userinfo: UserInfo,
}

impl FaydaClient {
    /// Create a new client using the builder pattern
    pub fn builder() -> FaydaClientBuilder {
        FaydaClientBuilder::default()
    }

    /// Create a new client from a config
    pub fn new(config: FaydaConfig) -> Self {
        let auth = Auth::new(config.clone());
        let token = Token::new(config.clone());
        let userinfo = UserInfo::new(config.clone());

        FaydaClient {
            auth,
            token,
            userinfo,
        }
    }
}
