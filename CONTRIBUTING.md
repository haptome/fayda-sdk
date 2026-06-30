# Contributing to fayda-sdk

First off — thank you! Every contribution, from a typo fix to a new language port, helps make Fayda integration easier for Ethiopian developers.

---

## Ways to Contribute

| Type | Where to start |
|---|---|
| Bug report | [Open an issue](https://github.com/haptome/fayda-sdk/issues/new) |
| Feature request | [Open a discussion](https://github.com/haptome/fayda-sdk/discussions) |
| Fix a bug | Pick an [open issue](https://github.com/haptome/fayda-sdk/issues) |
| Add a language port | Open a discussion first so we can align on the API contract |
| Improve docs or examples | PRs welcome — no issue needed for small fixes |

---

## Quick Start

### 1. Fork and clone

```bash
git clone git@github.com:<your-username>/fayda-sdk.git
cd fayda-sdk
```

### 2. Set up the package you're working on

**Python**
```bash
cd packages/python
python -m venv venv && source venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v
```

**Node.js**
```bash
cd packages/node
npm install && npm test
```

**React**
```bash
cd packages/react
npm install && npm test
```

**Go**
```bash
cd packages/go
go test ./... -v -race
```

**Rust**
```bash
cd packages/rust
cargo test
```

---

## Project Structure

```
fayda-sdk/
├── packages/
│   ├── python/          # pip: fayda-sdk
│   ├── node/            # npm: @fayda/sdk (includes NestJS module)
│   ├── react/           # npm: @fayda/react
│   ├── go/              # go get github.com/haptome/fayda-sdk/packages/go
│   └── rust/            # cargo add fayda-sdk
├── examples/            # One runnable example per language
├── tests/fixtures/      # Shared mock data (JWK, JWT, JSON responses)
├── docs/                # Full spec and API reference
└── .github/workflows/   # CI/CD — test matrix + publish on tag
```

---

## Ground Rules

### API contract is frozen

The public method names, parameter names, and return types in `docs/FAYDA_SDK_SPEC.md` Section 4 are **final**. Do not rename them. If you believe a breaking change is necessary, open a discussion first.

### One concern per PR

Bug fixes should not include refactors. New features should not fix unrelated bugs. Keep diffs small and focused.

### Commit message format

```
type(scope): short description

# Types: feat, fix, docs, test, refactor, ci, chore
# Scopes: python, node, react, go, rust, examples, ci

feat(go): add token refresh via silent re-auth
fix(python): correct base64url padding in PKCE verifier
docs: update README with popup mode example
```

---

## Testing Strategy

### The 8-point checklist

Every package must test all of these:

1. **PKCE generation** — verifier is 43–128 chars, URL-safe, no padding; challenge = SHA-256 of verifier
2. **Authorization URL** — all required params present, `code_challenge_method=S256`
3. **State validation** — mismatched state raises `FaydaAuthError` (not a generic error)
4. **JWT client assertion** — correct `iss`, `sub`, `aud`, `exp > iat`, `jti` present
5. **Token exchange** — 200 OK → `FaydaTokens`; 4xx → correct error subclass
6. **UserInfo decoding** — JWT → `FaydaUser`; `name#am` → `name_am` field mapping
7. **Error mapping** — each Fayda error code maps to the correct SDK error subclass
8. **Sandbox mode** — all methods return mock data with zero HTTP calls

### Shared test fixtures

All packages share `tests/fixtures/`:

| File | Purpose |
|---|---|
| `mock_userinfo.json` | FaydaUser claims with multilingual fields (`name#am`, `name#en`) |
| `mock_token_response.json` | Token endpoint success response |
| `mock_error_response.json` | Token endpoint error response |
| `mock_jwk.json` | RSA-2048 public JWK |
| `mock_private_jwk.json` | RSA-2048 private JWK (for signing test tokens) |
| `mock_id_token.jwt` | Pre-signed JWT for userinfo decode tests |

---

## Implementation Rules

### PKCE

- `code_verifier`: 64 random bytes → base64url, **no padding** → 86 characters
- `code_challenge`: `BASE64URL(SHA256(ASCII(code_verifier)))`, no padding
- Always use cryptographically secure randomness (`secrets.token_bytes`, `crypto/rand`, `rand::thread_rng`, etc.)

### JWT client assertion

```json
{
  "iss": "YOUR_CLIENT_ID",
  "sub": "YOUR_CLIENT_ID",
  "aud": "https://esignet.ida.et/v1/esignet/oauth/token",
  "iat": 1700000000,
  "exp": 1700007200,
  "jti": "<random UUID>"
}
```

- `aud` must be the **full token endpoint URL**, not just the base URL
- `exp` = `iat + 7200` (2 hours)
- `jti` is required to prevent replay attacks

### Token exchange

- `Content-Type: application/x-www-form-urlencoded` — **not JSON**
- All fields required: `grant_type`, `client_id`, `code`, `redirect_uri`, `code_verifier`, `client_assertion_type`, `client_assertion`

### UserInfo response

- The response is a **signed JWT string**, not raw JSON
- Decode the payload without verifying the signature (claims extraction only)
- Map localized fields: `name#am` → `name_am`, `name#en` → `name_en`

### State validation

Always use **constant-time comparison** — never `===` or `==`:

| Language | Method |
|---|---|
| Python | `secrets.compare_digest(a, b)` |
| Node.js | `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` |
| Go | `subtle.ConstantTimeCompare([]byte(a), []byte(b))` |
| Rust | `constant_time_eq::constant_time_eq(a.as_bytes(), b.as_bytes())` |

Raise `FaydaAuthError` on mismatch.

### Private key format

```
base64_decode(private_key_b64) → UTF-8 string → JSON.parse → JWK object → import as RSA key
```

### Sandbox mode

When `sandbox=true`, **every** method must return hardcoded mock data with zero network calls. Tests must verify no HTTP requests are made.

---

## Error Hierarchy

All packages must implement this hierarchy:

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

Fayda error code → SDK error class:

| `error` field | SDK class |
|---|---|
| `invalid_assertion` | `FaydaInvalidAssertionError` |
| `invalid_transaction` | `FaydaInvalidTransactionError` |
| `invalid_request` | `FaydaInvalidRequestError` |
| `invalid_client` | `FaydaTokenError` |
| `access_denied` | `FaydaTokenError` |

---

## PR Checklist

- [ ] All tests pass for the affected package(s)
- [ ] New behaviour is covered by tests
- [ ] No changes to the frozen public API surface (or discussion opened first)
- [ ] Sandbox mode still works (zero HTTP calls)
- [ ] PKCE uses cryptographically secure randomness
- [ ] State validation uses constant-time comparison
- [ ] Token endpoint POST uses `application/x-www-form-urlencoded`

---

## Adding a New Language Port

1. Open a discussion and link to the language's OIDC ecosystem
2. Implement the exact API contract from `docs/FAYDA_SDK_SPEC.md` Section 4
3. Pass all 8 tests in the checklist above
4. Add a runnable example in `examples/<language>/`
5. Add a CI workflow in `.github/workflows/<language>.yml`

---

## Releasing

Maintainers handle releases. Tag format triggers publishing:

| Tag | Publishes |
|---|---|
| `python-v0.x.0` | PyPI: `fayda-sdk` |
| `node-v0.x.0` | npm: `@fayda/sdk`, `@fayda/react` |
| `go-v0.x.0` | Go module tag |
| `rust-v0.x.0` | crates.io: `fayda-sdk` |

Update version strings in `pyproject.toml`, `package.json` (×2), and `Cargo.toml` before tagging.

---

## Questions?

Open a [GitHub Discussion](https://github.com/haptome/fayda-sdk/discussions) — we're happy to help.
