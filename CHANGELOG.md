# Changelog

All notable changes to fayda-sdk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0] - 2026-06-30

Initial release of the fayda-sdk monorepo — a multi-language SDK for Ethiopia's
Fayda National Digital ID (eSignet / VeriFayda 2.0).

### Added

#### Core SDKs

- **Python** (`fayda-sdk` on PyPI)
  - `FaydaClient` and `AsyncFaydaClient` with full PKCE + JWT + CSRF flow
  - Sync and async support via `httpx`
  - 18 unit tests covering all critical paths
  - Sandbox mode (zero network calls, mock Abebe Bikila user)

- **Node.js / TypeScript** (`@fayda/sdk` on npm)
  - `FaydaClient` with strict TypeScript types
  - ESM + CommonJS dual build
  - NestJS dynamic module (`FaydaModule.forRoot`) with `@InjectFayda` and `@FaydaCallback` decorators

- **React** (`@fayda/react` on npm)
  - `FaydaProvider` context component
  - `useFayda` hook (`login`, `logout`, `silentRefresh`, `isLoading`, `error`)
  - `FaydaSignInButton` with dark/light themes and 3 logo variants (mark, wordmark, full)
  - `FaydaCallbackPage` for popup and silent re-auth callback handling

- **Go** (`github.com/haptome/fayda-sdk/packages/go`)
  - `NewClient` with functional options pattern
  - `context.Context`-aware throughout
  - Constant-time state validation via `crypto/subtle`
  - 10 unit tests

- **Rust** (`fayda-sdk` on crates.io)
  - `FaydaClientBuilder` with builder pattern
  - Full async via `tokio`
  - `thiserror`-based error hierarchy
  - 14 unit tests

#### Authentication Features

- PKCE (Proof Key for Code Exchange) with SHA-256 and base64url encoding
- JWT client assertion signing with RS256 and your RSA-2048 private key
- Constant-time state validation (timing-attack resistant) in all languages
- `claims` parameter support for requesting specific user fields

#### Framework Middleware

- **Python/Flask** — `FaydaFlask` auto-wires `/login` and `/auth/callback`; `@fayda_login_required` decorator
- **Python/Django** — `FaydaLoginRequiredMixin`, `FaydaLoginView`, `FaydaCallbackView`
- **Node.js/Express** — `faydaLogin`, `faydaCallback`, `faydaLoginRequired`, `faydaLogout`
- **Go** — `RequireAuth` middleware, `LoginHandler`, `CallbackHandler` with `SessionStore` interface
- **Rust/Axum** — `require_fayda_auth` middleware layer (opt-in via `features = ["axum"]`)

#### Security

- ID token verification via Fayda's public JWKS (fetched from OIDC discovery endpoint)
  - Python: `client.token.verify_id_token(id_token)` — JWKS cached with 1-hour TTL
  - Node.js: `client.token.verifyIdToken(idToken)` — automatic key rotation via `jose`
  - Go: `client.Token.Verify(ctx, idToken)` — thread-safe JWKS cache with `sync.Mutex`
  - Rust: `client.token.verify(id_token).await` — kid-matched JWKS key lookup

#### React UX Features

- **Popup mode** — `login(claims, { mode: "popup" })` opens a 520×650 popup; resolves when user completes login
- **Silent re-auth** — `silentRefresh()` attempts re-authentication in a hidden iframe; replaces expired sessions without a visible redirect
- **`FaydaCallbackPage`** — drop-in component that detects popup/iframe context and posts `code+state` back to the parent window

#### Examples

- Flask (Python) — full login flow with session management
- Django (Python) — class-based views with `FaydaLoginRequiredMixin`
- Express (Node.js) — session-based auth
- React SPA — `FaydaProvider` + `useFayda` + popup mode
- Go `net/http` — complete callback handling with gorilla/sessions
- Axum (Rust) — async server with `require_fayda_auth` middleware

#### Infrastructure

- GitHub Actions CI/CD for all 4 languages (test matrix + publish on tag)
- Shared test fixtures in `tests/fixtures/` (JWK, JWT, mock responses)
- MIT License

---

[Unreleased]: https://github.com/haptome/fayda-sdk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/haptome/fayda-sdk/releases/tag/v0.1.0
