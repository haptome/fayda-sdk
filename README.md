# fayda-sdk

> Open-source multi-language SDK for Ethiopia's Fayda National Digital ID (eSignet / VeriFayda 2.0)

**Add "Login with Fayda ID" to your app in ~10 lines of code.**

[![Python](https://img.shields.io/badge/python-3.9+-blue)](packages/python/) 
[![Node.js](https://img.shields.io/badge/node-18+-green)](packages/node/) 
[![Go](https://img.shields.io/badge/go-1.21+-00ADD8)](packages/go/) 
[![Rust](https://img.shields.io/badge/rust-1.75+-ce3262)](packages/rust/)

---

## What This Is

An SDK that wraps the Fayda eSignet OIDC API. Instead of implementing PKCE, JWT signing, and OAuth callback handling yourself, use fayda-sdk:

```python
# Python
user = client.userinfo.get_from_code(code, state, expected_state, code_verifier)
print(f"Hello, {user.name}!")
```

```typescript
// Node.js
const user = await client.userinfo.getFromCode({ code, state, expectedState, codeVerifier });
console.log(`Hello, ${user.name}!`);
```

```go
// Go
user, err := client.UserInfo.GetFromCode(ctx, fayda.GetFromCodeParams{...})
fmt.Printf("Hello, %s!\n", user.Name)
```

```rust
// Rust
let user = client.userinfo().get_from_code(params).await?;
println!("Hello, {}!", user.name.unwrap_or_default());
```

---

## Supported Languages

| Language | Package | Install |
|---|---|---|
| **Python** | `fayda-sdk` | `pip install fayda-sdk` |
| **Node.js** | `@fayda/sdk` | `npm install @fayda/sdk` |
| **NestJS** | `@fayda/sdk/nestjs` | *(included in @fayda/sdk)* |
| **React** | `@fayda/react` | `npm install @fayda/react` |
| **Go** | `fayda-go` | `go get github.com/fayda-sdk/fayda-go` |
| **Rust** | `fayda-sdk` | `cargo add fayda-sdk` |

---

## Quick Start (Python Example)

```python
from fayda_sdk import FaydaClient

# Initialize client
client = FaydaClient(
    client_id=os.environ["FAYDA_CLIENT_ID"],
    private_key_b64=os.environ["FAYDA_PRIVATE_KEY"],
    redirect_uri="https://myapp.com/auth/callback",
)

# Step 1: Generate login URL
result = client.auth.get_authorization_url()
session["fayda_state"] = result.state
session["fayda_verifier"] = result.code_verifier
return redirect(result.url)

# Step 2: Handle callback
@app.route("/auth/callback")
def callback():
    user = client.userinfo.get_from_code(
        code=request.args["code"],
        state=request.args["state"],
        expected_state=session["fayda_state"],
        code_verifier=session["fayda_verifier"],
    )
    # user.sub, user.name, user.email, user.phone_number ...
    return redirect("/dashboard")
```

---

## Architecture

The SDK implements the complete Fayda eSignet OIDC + PKCE flow:

```
Your App → Fayda Login → Callback → Token Exchange → User Info
   (step 1)   (step 2)   (step 3)     (step 4)       (step 5)
```

Each step is handled transparently by the SDK. What you see is just clean, typed API calls.

---

## Features

✅ **PKCE support** — Secure authorization code flow  
✅ **JWT signing** — Client assertion via RSA-2048  
✅ **Multilingual** — Support for English and Amharic user data  
✅ **Sandbox mode** — Test without real credentials  
✅ **Type-safe** — Fully typed in Python, TypeScript, Go, Rust  
✅ **Tested** — Unit tests with 100% coverage per package  

---

## Documentation

- [Full SDK Specification](docs/FAYDA_SDK_SPEC.md) — API contract, data models, error codes
- [Fayda API Reference](docs/FAYDA_API_REFERENCE.md) — Raw endpoint docs
- [Contributing Guide](docs/CONTRIBUTING.md) — Monorepo layout, build instructions

---

## Getting Credentials

1. Go to [partner.fayda.et](https://partner.fayda.et)
2. Register your organization
3. Complete onboarding review (Fayda team approves)
4. Receive: `client_id` and `private_key_b64`
5. Register your `redirect_uri` in the portal

Support: `api_support@id.et`

---

## Examples

See [examples/](examples/) directory:
- `python/flask_example.py` — Full Flask integration
- `python/django_example.py` — Full Django integration
- `node/express_example.ts` — Full Express integration
- `nestjs/app.module.ts` — NestJS module setup
- `react/App.tsx` — React component usage
- `go/main.go` — Go HTTP server
- `rust/main.rs` — Rust Axum server

---

## License

MIT

---

## Support

- GitHub: [fayda-sdk/fayda-sdk](https://github.com/fayda-sdk/fayda-sdk)
- Issues: [Report a bug](https://github.com/fayda-sdk/fayda-sdk/issues)
