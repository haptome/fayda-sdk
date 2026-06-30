# Contributing to fayda-sdk

Thank you for your interest in contributing! This guide explains the monorepo layout and how to work with each package.

---

## Monorepo Layout

```
fayda-sdk/
├── packages/
│   ├── python/          # pip: fayda-sdk
│   ├── node/            # npm: @fayda/sdk (includes NestJS & React sub-modules)
│   ├── react/           # npm: @fayda/react
│   ├── go/              # go get: github.com/fayda-sdk/fayda-go
│   └── rust/            # cargo: fayda-sdk
├── examples/            # Sample apps per language
├── tests/fixtures/      # Shared mock data (JSON, JWK, JWT)
├── docs/                # Spec docs
└── .github/workflows/   # CI/CD
```

---

## Development Setup

### Python

```bash
cd packages/python
pip install -e ".[dev]"
pytest tests/ -v --cov=fayda_sdk
```

### Node.js

```bash
cd packages/node
npm install
npm test
npm run build
```

### React

```bash
cd packages/react
npm install
npm test
```

### Go

```bash
cd packages/go
go test ./... -v
```

### Rust

```bash
cd packages/rust
cargo test
cargo build --release
```

---

## Release / Publishing

### Version Tags

Tag format triggers publishing:
- `python-v0.1.0` → publish Python to PyPI
- `node-v0.1.0` → publish Node + NestJS + React to npm
- `go-v0.1.0` → create Go module tag
- `rust-v0.1.0` → publish to crates.io

GitHub Actions workflows automatically publish on tag creation.

### Version Sync

All packages share the same version number (`0.1.0`, `0.2.0`, etc.) for simplicity.
Update version in:
- `packages/python/pyproject.toml`
- `packages/node/package.json`
- `packages/node/package.json` (React sub-package)
- `packages/go/go.mod` (optional, handled by git tag)
- `packages/rust/Cargo.toml`

---

## Testing Strategy

### Per-Package Tests

Each package must verify:
1. ✅ PKCE generation — verifier 43–128 chars, URL-safe, no padding; challenge = SHA256 hash
2. ✅ Authorization URL — all required params present, `code_challenge_method=S256`
3. ✅ State validation — mismatched state raises `FaydaAuthError` (not generic error)
4. ✅ JWT client assertion — correct `iss`, `sub`, `aud`, `exp > iat` fields
5. ✅ Token exchange — 200 OK → `FaydaTokens`; 4xx → correct error subclass
6. ✅ UserInfo decoding — JWT → `FaydaUser`; `name#am` → `name_am` field mapping
7. ✅ Error mapping — each Fayda error code maps to correct SDK error subclass
8. ✅ Sandbox mode — all methods return mock data with zero HTTP calls

### Shared Test Fixtures

All packages use files in `tests/fixtures/`:
- `mock_userinfo.json` — FaydaUser JSON with raw JWT keys (`name#am`, `name#en`)
- `mock_token_response.json` — token endpoint success response
- `mock_error_response.json` — token endpoint error response
- `mock_jwk.json` — RSA-2048 public JWK
- `mock_private_jwk.json` — RSA-2048 private JWK (for signing test tokens)
- `mock_id_token.jwt` — pre-signed JWT for userinfo decode tests

---

## API Contract (FINAL)

The public API surface is **frozen**. Do not rename methods, parameters, or return types. The spec defines the exact contract — see `FAYDA_SDK_SPEC.md` Section 4 and 6.

---

## Key Implementation Rules

### PKCE
- `code_verifier`: 64 random bytes → base64url, **no padding**. Result: 86 chars.
- `code_challenge`: SHA256 of the ASCII string `code_verifier` → base64url, no padding.
- Always use cryptographically secure randomness (`secrets.token_bytes`, `os.urandom`, `crypto.randomBytes`, `rand.Read`, etc.).

### JWT Client Assertion
- Payload: `{ iss, sub, aud, iat, exp, jti }`
- All IDs (`iss`, `sub`) = `client_id`
- `aud` = full token endpoint URL (not just base URL)
- `exp` = `iat + 7200` (2 hours)
- Always include `jti` (UUID) to prevent replay attacks

### Private Key Handling
```
base64_decode(private_key_b64)  →  UTF-8 string  →  JSON.parse  →  JWK object  →  import as RSA key
```

### Token Exchange
- `Content-Type: application/x-www-form-urlencoded` — NOT JSON
- All form fields are required: `grant_type`, `client_id`, `code`, `redirect_uri`, `code_verifier`, `client_assertion_type`, `client_assertion`

### UserInfo Response
- Response is a **signed JWT** (not raw JSON)
- Decode without signature verification (claims extraction only)
- Map `name#am` → `name_am`, `name#en` → `name_en`
- All other fields deserialize as-is

### State Validation
- **Always use constant-time comparison**:
  - Python: `secrets.compare_digest(a, b)`
  - Node: `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`
  - Go: `subtle.ConstantTimeCompare([]byte(a), []byte(b))`
  - Rust: `constant_time_eq::constant_time_eq(a.as_bytes(), b.as_bytes())`
- Raise `FaydaAuthError` on mismatch (not generic error)

### Claims URL Parameter
```
json_str = JSON.stringify(claims)
url_encoded = encodeURIComponent(json_str)
// Do NOT double-encode
```

### Sandbox Mode
- When `sandbox=true`, ALL methods return hardcoded mock data
- **Zero network calls** — mock interceptors must verify this
- `get_mock()` is available only when sandbox is enabled; raise `FaydaSandboxError` otherwise

---

## Code Style

- **Python**: PEP 8, type hints, docstrings
- **TypeScript**: ESLint strict mode, Prettier formatting, JSDoc for public APIs
- **Go**: `gofmt`, idiomatic Go (errors as values, no panics)
- **Rust**: `rustfmt`, `clippy`, idiomatic Rust error handling

---

## Error Hierarchy

All errors must follow this structure:

```
FaydaError (base)
├── FaydaConfigError          — Bad client config at init
├── FaydaAuthError            — State mismatch on callback
├── FaydaTokenError           — Token exchange failed
│   ├── FaydaInvalidAssertionError    — JWT signature bad
│   ├── FaydaInvalidTransactionError  — Flow interrupted
│   └── FaydaInvalidRequestError      — Malformed request params
├── FaydaUserInfoError        — UserInfo fetch failed
└── FaydaSandboxError         — Attempted real API call in sandbox
```

Map Fayda API error codes to the correct subclass:
- `invalid_assertion` → `FaydaInvalidAssertionError`
- `invalid_transaction` → `FaydaInvalidTransactionError`
- `invalid_request` → `FaydaInvalidRequestError`
- `invalid_client` → `FaydaTokenError` (base)
- `access_denied` → `FaydaTokenError` (base)

---

## Pull Request Checklist

Before submitting a PR:
- [ ] All unit tests pass for the affected package(s)
- [ ] No breaking changes to public API (unless approved)
- [ ] Code follows language-specific style guidelines
- [ ] Error handling matches the spec
- [ ] Sandbox mode works (zero network calls)
- [ ] PKCE implementation uses secure randomness
- [ ] State validation uses constant-time comparison
- [ ] Claims URL encoding is correct (single JSON.stringify, then percent-encode)

---

## Questions?

Open an issue on GitHub: https://github.com/fayda-sdk/fayda-sdk/issues
