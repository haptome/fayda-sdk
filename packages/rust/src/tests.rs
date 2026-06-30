#[cfg(test)]
mod tests {
    use crate::{
        auth::Auth,
        config::FaydaClientBuilder,
        errors::{map_token_error, FaydaError},
        models::GetFromCodeParams,
        token::Token,
        userinfo::UserInfo,
    };
    use base64::Engine;

    fn test_config(sandbox: bool) -> crate::config::FaydaConfig {
        FaydaClientBuilder::default()
            .client_id("test-client")
            .private_key_base64("dGVzdA==")
            .redirect_uri("http://localhost/callback")
            .sandbox(sandbox)
            .build()
            .expect("config build failed")
    }

    #[tokio::test]
    async fn test_pkce_verifier_length() {
        let auth = Auth::new(test_config(false));
        let result = auth.get_authorization_url(None).await.unwrap();
        assert!(result.code_verifier.len() >= 43 && result.code_verifier.len() <= 128);
    }

    #[tokio::test]
    async fn test_pkce_verifier_urlsafe() {
        let auth = Auth::new(test_config(false));
        let result = auth.get_authorization_url(None).await.unwrap();
        assert!(!result.code_verifier.contains('+'));
        assert!(!result.code_verifier.contains('/'));
        assert!(!result.code_verifier.contains('='));
    }

    #[tokio::test]
    async fn test_pkce_challenge_is_sha256() {
        use sha2::{Digest, Sha256};
        let auth = Auth::new(test_config(false));
        let result = auth.get_authorization_url(None).await.unwrap();

        let mut hasher = Sha256::new();
        hasher.update(result.code_verifier.as_bytes());
        let expected = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hasher.finalize());

        let url = url::Url::parse(&result.url).unwrap();
        let challenge = url
            .query_pairs()
            .find(|(k, _)| k == "code_challenge")
            .map(|(_, v)| v.to_string())
            .unwrap();
        assert_eq!(challenge, expected);
    }

    #[tokio::test]
    async fn test_auth_url_required_params() {
        let auth = Auth::new(test_config(false));
        let result = auth.get_authorization_url(None).await.unwrap();
        let url = url::Url::parse(&result.url).unwrap();
        let params: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();

        assert_eq!(
            params.get("response_type").map(String::as_str),
            Some("code")
        );
        assert_eq!(
            params.get("client_id").map(String::as_str),
            Some("test-client")
        );
        assert_eq!(
            params.get("code_challenge_method").map(String::as_str),
            Some("S256")
        );
        assert_eq!(
            params.get("state").map(String::as_str),
            Some(result.state.as_str())
        );
    }

    #[test]
    fn test_validate_callback_success() {
        let auth = Auth::new(test_config(false));
        assert!(auth.validate_callback("abc123", "abc123").is_ok());
    }

    #[test]
    fn test_validate_callback_mismatch() {
        let auth = Auth::new(test_config(false));
        let err = auth.validate_callback("state1", "state2").unwrap_err();
        assert!(matches!(err, FaydaError::Auth(_)));
    }

    #[tokio::test]
    async fn test_sandbox_token_exchange() {
        let token = Token::new(test_config(true));
        let tokens = token.exchange("code", "verifier").await.unwrap();
        assert_eq!(tokens.access_token, "mock-access-token-abc123def456");
        assert_eq!(tokens.expires_in, 3600);
    }

    #[tokio::test]
    async fn test_sandbox_userinfo_get() {
        let ui = UserInfo::new(test_config(true));
        let user = ui.get("any-token").await.unwrap();
        assert_eq!(user.sub, "mock-fayda-id-000001");
        assert_eq!(user.name_am.as_deref(), Some("አበበ ቢኪላ"));
    }

    #[test]
    fn test_get_mock_in_sandbox() {
        let ui = UserInfo::new(test_config(true));
        let user = ui.get_mock().unwrap();
        assert_eq!(user.sub, "mock-fayda-id-000001");
    }

    #[test]
    fn test_get_mock_outside_sandbox() {
        let ui = UserInfo::new(test_config(false));
        let err = ui.get_mock().unwrap_err();
        assert!(matches!(err, FaydaError::Sandbox(_)));
    }

    #[test]
    fn test_map_token_error_invalid_assertion() {
        let err = map_token_error("invalid_assertion", "desc");
        assert!(matches!(err, FaydaError::InvalidAssertion(_)));
    }

    #[test]
    fn test_map_token_error_invalid_transaction() {
        let err = map_token_error("invalid_transaction", "desc");
        assert!(matches!(err, FaydaError::InvalidTransaction(_)));
    }

    #[test]
    fn test_map_token_error_invalid_request() {
        let err = map_token_error("invalid_request", "desc");
        assert!(matches!(err, FaydaError::InvalidRequest(_)));
    }

    #[test]
    fn test_map_token_error_unknown() {
        let err = map_token_error("unknown_code", "some description");
        assert!(matches!(err, FaydaError::Token { .. }));
    }
}
