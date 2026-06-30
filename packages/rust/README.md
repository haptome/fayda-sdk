# fayda-sdk

Rust SDK for Ethiopia's Fayda National Digital ID (eSignet).

## Install

Add to your `Cargo.toml`:

```toml
[dependencies]
fayda-sdk = "0.1.0"
tokio = { version = "1", features = ["full"] }
```

## Quick Start

```rust
use fayda_sdk::FaydaClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = FaydaClient::builder()
        .client_id(std::env::var("FAYDA_CLIENT_ID")?)
        .private_key_base64(std::env::var("FAYDA_PRIVATE_KEY")?)
        .redirect_uri("https://myapp.com/auth/callback")
        .build()?;

    // Step 1: Generate authorization URL
    let result = client.auth.get_authorization_url(None).await?;
    // Store result.state and result.code_verifier in session
    // Redirect user to result.url

    // Step 2: Handle callback
    let user = client.userinfo.get_from_code(
        fayda_sdk::GetFromCodeParams {
            code: "AUTH_CODE".to_string(),
            state: "CALLBACK_STATE".to_string(),
            expected_state: "SESSION_STATE".to_string(),
            code_verifier: "SESSION_VERIFIER".to_string(),
        },
        &client.auth,
        &client.token,
    ).await?;

    println!("Hello, {}!", user.name.unwrap_or_default());
    Ok(())
}
```

## Environment Variables

| Variable | Description |
|---|---|
| `FAYDA_CLIENT_ID` | Your eSignet client ID |
| `FAYDA_PRIVATE_KEY` | Base64-encoded JWK private key |
| `FAYDA_REDIRECT_URI` | OAuth callback URL |
| `FAYDA_SANDBOX` | Set to "true" for sandbox mode (optional) |

## Error Handling

```rust
use fayda_sdk::FaydaError;

match client.userinfo.get(&token).await {
    Ok(user) => println!("User: {}", user.name.unwrap_or_default()),
    Err(FaydaError::Auth(_)) => println!("CSRF attack detected"),
    Err(FaydaError::InvalidTransaction(_)) => println!("Auth flow interrupted"),
    Err(FaydaError::Token { code, .. }) => println!("Token error: {}", code),
    Err(e) => println!("Error: {}", e),
}
```

## Full Documentation

See [FAYDA_SDK_SPEC.md](../../docs/FAYDA_SDK_SPEC.md) for the complete API reference.

## Implementation Status

Current status: **Foundation complete, core logic pending**

- ✅ Config, models, errors
- ✅ Auth module (PKCE + state validation)
- 🚧 Token module (JWT signing pending)
- 🚧 UserInfo module (JWT decode pending)
- ✅ Client wiring

See the Python implementation (`packages/python/`) for reference logic to complete token and userinfo modules.
