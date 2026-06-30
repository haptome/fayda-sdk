# Fayda SDK — Full Architecture & Specification

> Community SDK for Ethiopia's National Digital ID (Fayda / eSignet / VeriFayda 2.0)
> Target languages: Python · Node.js · NestJS · React · Go · Rust

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Core Concepts](#3-core-concepts)
4. [Shared API Contract](#4-shared-api-contract)
5. [Module Specifications](#5-module-specifications)
   - 5.1 Auth Module
   - 5.2 Token Module
   - 5.3 UserInfo Module
   - 5.4 Errors Module
6. [Language Package Specs](#6-language-package-specs)
   - 6.1 Python
   - 6.2 Node.js
   - 6.3 NestJS
   - 6.4 React
   - 6.5 Go
   - 6.6 Rust
7. [Data Models](#7-data-models)
8. [Error Codes Reference](#8-error-codes-reference)
9. [Fayda API Endpoints](#9-fayda-api-endpoints)
10. [Sandbox / Mock Mode](#10-sandbox--mock-mode)
11. [CI/CD & Publishing](#11-cicd--publishing)
12. [Testing Strategy](#12-testing-strategy)
13. [Claude Code Build Instructions](#13-claude-code-build-instructions)

---

## 1. Project Overview

### What This Is

An open-source, multi-language SDK that lets any developer add **"Login with Fayda ID"** to their application in under 10 lines of code — without needing to read or understand the raw eSignet OIDC documentation.

### Problem Being Solved

The Fayda eSignet API follows OIDC + PKCE + client assertion JWT — a chain of 4–5 steps with non-trivial cryptography at each step. Right now every Ethiopian developer must implement this from scratch, reading dense Confluence docs. This SDK wraps all of it into one clean interface per language.

### What the SDK Does

- Builds the PKCE authorization URL and redirects the user to Fayda login
- Handles the OAuth callback and validates CSRF state
- Signs the client assertion JWT with the developer's RSA private key
- Exchanges the authorization code for tokens
- Fetches and decodes the `/userinfo` JWT into a typed user object
- Returns clean, typed errors for every failure mode

### Non-Goals

- Does NOT store tokens (the app manages sessions)
- Does NOT provide a UI login button (except the React package)
- Does NOT handle refresh tokens (Fayda eSignet does not currently expose them)

### Repository Name

`fayda-sdk` — GitHub: `github.com/fayda-sdk/fayda-sdk`

---

## 2. Monorepo Structure

```
fayda-sdk/
│
├── packages/
│   ├── python/                   # pip install fayda-sdk
│   │   ├── fayda_sdk/
│   │   │   ├── __init__.py
│   │   │   ├── client.py         # FaydaClient entry point
│   │   │   ├── config.py         # FaydaConfig internal dataclass
│   │   │   ├── models.py         # FaydaUser, FaydaTokens dataclasses
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   └── flow.py       # AuthModule
│   │   │   ├── token/
│   │   │   │   ├── __init__.py
│   │   │   │   └── exchange.py   # TokenModule
│   │   │   ├── userinfo/
│   │   │   │   ├── __init__.py
│   │   │   │   └── fetch.py      # UserInfoModule
│   │   │   └── errors/
│   │   │       ├── __init__.py
│   │   │       └── exceptions.py # All error classes
│   │   ├── tests/
│   │   │   ├── test_auth.py
│   │   │   ├── test_token.py
│   │   │   └── test_userinfo.py
│   │   ├── pyproject.toml
│   │   └── README.md
│   │
│   ├── node/                     # npm: @fayda/sdk (Node.js + NestJS module)
│   │   ├── src/
│   │   │   ├── index.ts          # FaydaClient entry point
│   │   │   ├── config.ts
│   │   │   ├── models.ts
│   │   │   ├── auth/
│   │   │   │   └── flow.ts       # AuthModule
│   │   │   ├── token/
│   │   │   │   └── exchange.ts   # TokenModule
│   │   │   ├── userinfo/
│   │   │   │   └── fetch.ts      # UserInfoModule
│   │   │   ├── errors/
│   │   │   │   └── index.ts
│   │   │   └── nestjs/
│   │   │       ├── fayda.module.ts
│   │   │       ├── fayda.service.ts
│   │   │       └── fayda.decorator.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── react/                    # npm: @fayda/react
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── FaydaProvider.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useFayda.ts
│   │   │   └── components/
│   │   │       └── FaydaLoginButton.tsx
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── go/                       # go get github.com/fayda-sdk/fayda-go
│   │   ├── fayda/
│   │   │   ├── client.go
│   │   │   ├── config.go
│   │   │   ├── models.go
│   │   │   ├── auth.go
│   │   │   ├── token.go
│   │   │   ├── userinfo.go
│   │   │   └── errors.go
│   │   ├── go.mod
│   │   └── README.md
│   │
│   └── rust/                     # cargo add fayda-sdk
│       ├── src/
│       │   ├── lib.rs
│       │   ├── client.rs
│       │   ├── config.rs
│       │   ├── models.rs
│       │   ├── auth.rs
│       │   ├── token.rs
│       │   ├── userinfo.rs
│       │   └── errors.rs
│       ├── Cargo.toml
│       └── README.md
│
├── examples/
│   ├── python/
│   │   ├── flask_example.py      # Full Flask login flow
│   │   └── django_example.py     # Full Django login flow
│   ├── node/
│   │   └── express_example.ts    # Full Express login flow
│   ├── nestjs/
│   │   └── app.module.ts         # NestJS module wiring
│   ├── react/
│   │   └── App.tsx               # React login page example
│   ├── go/
│   │   └── main.go               # Go HTTP server example
│   └── rust/
│       └── main.rs               # Actix-web example
│
├── docs/
│   ├── FAYDA_SDK_SPEC.md         # ← This file
│   ├── FAYDA_API_REFERENCE.md    # Raw Fayda endpoint reference
│   └── CONTRIBUTING.md
│
├── tests/
│   └── fixtures/
│       ├── mock_id_token.jwt     # Sample JWT for unit tests
│       ├── mock_userinfo.json    # Sample decoded user object
│       └── mock_jwk.json         # Sample JWK private key (test only)
│
└── .github/
    └── workflows/
        ├── python.yml
        ├── node.yml
        ├── go.yml
        └── rust.yml
```

---

## 3. Core Concepts

### 3.1 The OIDC Flow (What The SDK Implements)

Every package implements this exact 7-step flow:

```
Your App                    Fayda eSignet
    │                            │
    │── Step 1: generate PKCE ──>│
    │   code_verifier (random)   │
    │   code_challenge (SHA-256) │
    │                            │
    │── Step 2: redirect user ──>│  GET /authorize?client_id=...
    │                            │         &code_challenge=...
    │                            │         &state=...
    │                            │
    │                     [User authenticates with Fayda ID]
    │                     [OTP or biometrics]
    │                            │
    │<── Step 3: callback ───────│  GET /your-callback?code=AUTH_CODE&state=...
    │
    │── Step 4: validate state   (CSRF protection — compare state values)
    │
    │── Step 5: sign JWT ────────│  POST /token
    │   client_assertion JWT     │  body: code + code_verifier + client_assertion
    │   (signed with private key)│
    │                            │
    │<── Step 6: tokens ─────────│  { access_token, id_token }
    │
    │── Step 7: get user ────────│  GET /userinfo
    │   Authorization: Bearer    │
    │   access_token             │
    │                            │
    │<── user JWT ───────────────│  Decode → FaydaUser object
```

### 3.2 PKCE Explained Simply

PKCE prevents an attacker who intercepts the authorization code from using it:

1. Before redirecting the user, generate a random string: `code_verifier`
2. Hash it with SHA-256 and base64url-encode: `code_challenge`
3. Send `code_challenge` to Fayda in the authorization request
4. When exchanging the code for tokens, send the original `code_verifier`
5. Fayda hashes the verifier and checks it matches — only the original requester can do this

**Code Verifier**: random, 43–128 characters, URL-safe base64, stored in session

**Code Challenge**: `BASE64URL(SHA256(code_verifier))`, sent in the URL

### 3.3 Client Assertion JWT Explained Simply

Instead of a password, you prove your app's identity by signing a JWT with your RSA private key. Fayda verifies the signature using the public key you registered.

JWT payload:
```json
{
  "iss": "your-client-id",
  "sub": "your-client-id",
  "aud": "https://esignet.ida.et/v1/esignet/oauth/token",
  "iat": 1700000000,
  "exp": 1700007200
}
```

Signed with RS256 algorithm using your RSA private key.

### 3.4 Private Key Format

Fayda provides the private key as a **Base64-encoded JWK (JSON Web Key) set**:

```
Base64 string → decode → JSON string → parse → JWK object → import as RSA key
```

The JWK object contains: `kty`, `n`, `e`, `d`, `p`, `q`, `dp`, `dq`, `qi`, `kid`

---

## 4. Shared API Contract

Every language package exposes the **same logical API**, adapted to idiomatic style per language.

### 4.1 Initialization

```
FaydaClient(
  client_id:        string    -- Your eSignet Client ID from partner.fayda.et
  private_key_b64:  string    -- Base64-encoded JWK private key
  redirect_uri:     string    -- Your OAuth callback URL
  sandbox:          bool      -- Mock mode, no real credentials needed (default: false)
  acr_values:       string?   -- Auth method override (default: Fayda default)
  scopes:           string[]  -- OAuth scopes (default: ["openid","profile","email"])
  claims_locales:   string    -- "en" or "en am" for multilingual (default: "en")
)
```

### 4.2 Auth Module

```
auth.get_authorization_url(claims?) → { url, state, code_verifier }
auth.validate_callback(callback_state, expected_state) → void | raises
```

### 4.3 Token Module

```
token.exchange(code, code_verifier) → FaydaTokens { access_token, id_token, expires_in }
```

### 4.4 UserInfo Module

```
userinfo.get(access_token) → FaydaUser
userinfo.get_from_code(code, state, expected_state, code_verifier) → FaydaUser  ← convenience
userinfo.get_mock() → FaydaUser  ← sandbox only
```

### 4.5 FaydaUser Object

```
FaydaUser {
  sub:           string    -- Unique Fayda ID for this user (stable, use as user ID)
  name:          string?
  name_am:       string?   -- Amharic name (only if claims_locales includes "am")
  email:         string?
  phone_number:  string?
  picture:       string?   -- URL to profile photo
  gender:        string?
  birthdate:     string?   -- ISO 8601: "1990-01-01"
  address:       object?   -- { formatted, street_address, locality, region, country }
}
```

---

## 5. Module Specifications

### 5.1 Auth Module

**Responsibility**: Build the authorization URL with correct PKCE parameters; validate state on callback.

**get_authorization_url(claims?)**

Input:
- `claims` (optional): dict/object of OIDC claims to request. If omitted, requests all standard claims as non-essential.

Claims format:
```json
{
  "userinfo": {
    "name":         { "essential": true },
    "phone_number": { "essential": true },
    "email":        { "essential": false },
    "picture":      { "essential": false },
    "gender":       { "essential": false },
    "birthdate":    { "essential": false },
    "address":      { "essential": false }
  },
  "id_token": {}
}
```

Processing:
1. Generate `code_verifier`: `BASE64URL(RANDOM(64 bytes))` — strip padding
2. Generate `code_challenge`: `BASE64URL(SHA256(code_verifier))` — strip padding
3. Generate `state`: `BASE64URL(RANDOM(32 bytes))` — CSRF token
4. URL-encode `claims` JSON
5. Build query params (see below)
6. Return `{ url, state, code_verifier }`

Query params to include:
```
client_id          = config.client_id
response_type      = "code"
redirect_uri       = config.redirect_uri
scope              = "openid profile email"
state              = <generated state>
code_challenge     = <computed>
code_challenge_method = "S256"
claims_locales     = config.claims_locales
claims             = <url-encoded JSON>
acr_values         = config.acr_values  (omit if null)
```

Output: `{ url: string, state: string, code_verifier: string }`

**Developer responsibility**: Store `state` and `code_verifier` in the user's session between the redirect and the callback.

**validate_callback(callback_state, expected_state)**

- Compare using constant-time comparison (prevent timing attacks)
- Raise `FaydaAuthError` if they do not match

---

### 5.2 Token Module

**Responsibility**: Sign the client assertion JWT, POST to token endpoint, return tokens.

**exchange(code, code_verifier)**

Step 1 — Build client assertion JWT:

Header:
```json
{ "alg": "RS256", "typ": "JWT" }
```

Payload:
```json
{
  "iss": "<client_id>",
  "sub": "<client_id>",
  "aud": "<token_endpoint_url>",
  "iat": <current unix timestamp>,
  "exp": <iat + 7200>
}
```

Sign with RS256 using the private key decoded from `private_key_b64`:
```
private_key_b64 → base64_decode → utf8 string → JSON.parse → JWK object → import as RSA key
```

Step 2 — POST to token endpoint:

```
POST /v1/esignet/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<authorization_code>
&redirect_uri=<redirect_uri>
&client_id=<client_id>
&client_assertion=<signed_jwt>
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&code_verifier=<code_verifier>
```

Step 3 — Parse response:

Success `200 OK`:
```json
{
  "access_token": "eyJ...",
  "id_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Error `4xx`:
```json
{ "error": "invalid_assertion", "error_description": "..." }
```

Map error codes → typed SDK error classes (see Section 8).

Output: `FaydaTokens { access_token, id_token, token_type, expires_in }`

---

### 5.3 UserInfo Module

**Responsibility**: Fetch `/userinfo` with the access token, decode the JWT, return a typed `FaydaUser`.

**get(access_token)**

Step 1 — GET /userinfo:
```
GET /v1/esignet/oidc/userinfo
Authorization: Bearer <access_token>
```

Response is a signed JWT string (not JSON directly).

Step 2 — Decode JWT:

Decode without signature verification (Fayda's public key verification is optional for now — add JWKS support in v0.2):
```
jwt.decode(token, options={"verify_signature": False})
```

Step 3 — Map to FaydaUser:

Standard single-language fields: `sub`, `name`, `email`, `phone_number`, `picture`, `gender`, `birthdate`, `address`

Multilingual fields (when `claims_locales` includes multiple languages): `name#en`, `name#am`, `address#en`, `address#am` → map to `name_en`, `name_am`, etc.

Output: `FaydaUser` (see Section 7 for full model)

**get_from_code(code, state, expected_state, code_verifier)** — convenience method:

Calls in sequence:
1. `auth.validate_callback(state, expected_state)`
2. `token.exchange(code, code_verifier)`
3. `userinfo.get(tokens.access_token)`

Returns `FaydaUser` directly. This is the recommended method for simple integrations.

**get_mock()** — sandbox only:

Returns a hardcoded `FaydaUser` for development:
```json
{
  "sub": "mock-fayda-id-000001",
  "name": "Abebe Bikila",
  "name_am": "አበበ ቢኪላ",
  "email": "abebe.bikila@example.com",
  "phone_number": "+251911000000",
  "gender": "male",
  "birthdate": "1932-08-07",
  "picture": "https://via.placeholder.com/150"
}
```

---

### 5.4 Errors Module

All errors extend a base `FaydaError`. Every error has:
- `message`: human-readable description
- `code`: machine-readable error code string
- `http_status`: the HTTP status from Fayda (where applicable)
- `raw`: the raw response body (for debugging)

Error hierarchy:
```
FaydaError
├── FaydaConfigError        -- Bad client configuration at init time
├── FaydaAuthError          -- State mismatch on callback
├── FaydaTokenError         -- Token exchange failed
│   ├── FaydaInvalidAssertionError    -- Bad JWT signing (code: invalid_assertion)
│   ├── FaydaInvalidTransactionError  -- Interrupted flow (code: invalid_transaction)
│   └── FaydaInvalidRequestError      -- Bad request params (code: invalid_request)
├── FaydaUserInfoError      -- /userinfo fetch failed
└── FaydaSandboxError       -- Tried real API call in sandbox mode
```

---

## 6. Language Package Specs

### 6.1 Python Package

**Package name**: `fayda-sdk`
**Distribution**: PyPI
**Min Python**: 3.9+
**Install**: `pip install fayda-sdk`

**Dependencies**:
```toml
[project.dependencies]
httpx = ">=0.24"          # HTTP client (async-compatible)
python-jose = ">=3.3"     # JWT encode/decode
cryptography = ">=41.0"   # RSA key handling
```

**pyproject.toml**:
```toml
[project]
name = "fayda-sdk"
version = "0.1.0"
description = "Python SDK for Ethiopia's Fayda National Digital ID (eSignet)"
requires-python = ">=3.9"
license = { text = "MIT" }
keywords = ["fayda", "ethiopia", "digital-id", "oidc", "esignet"]

[project.urls]
Homepage = "https://github.com/fayda-sdk/fayda-sdk"
```

**Key design decisions**:
- Sync by default, async via `AsyncFaydaClient` (same interface, uses `httpx.AsyncClient`)
- All public methods are typed with dataclasses
- No global state — each `FaydaClient` instance is independent
- Private key decoded lazily on first token exchange call

**Public API surface**:
```python
from fayda_sdk import FaydaClient, FaydaUser, FaydaTokens
from fayda_sdk.errors import FaydaError, FaydaTokenError, FaydaAuthError

client = FaydaClient(
    client_id="...",
    private_key_b64="...",
    redirect_uri="...",
    sandbox=False,
    acr_values=None,
    scopes=["openid", "profile", "email"],
    claims_locales="en",
)

# Auth
result = client.auth.get_authorization_url(claims={...})
result.url          # str
result.state        # str  — save in session
result.code_verifier  # str — save in session

# Validate callback
client.auth.validate_callback(callback_state, expected_state)

# Token exchange
tokens = client.token.exchange(code, code_verifier)
tokens.access_token   # str
tokens.id_token       # str
tokens.expires_in     # int

# UserInfo
user = client.userinfo.get(access_token)
user.sub            # str
user.name           # str | None
user.email          # str | None

# Convenience (does all 3 above)
user = client.userinfo.get_from_code(
    code=code,
    state=callback_state,
    expected_state=session_state,
    code_verifier=session_verifier,
)

# Async client (same interface)
from fayda_sdk import AsyncFaydaClient
async with AsyncFaydaClient(...) as client:
    user = await client.userinfo.get_from_code(...)
```

**Flask integration example**:
```python
from flask import Flask, redirect, request, session
from fayda_sdk import FaydaClient

app = Flask(__name__)
client = FaydaClient(
    client_id=os.environ["FAYDA_CLIENT_ID"],
    private_key_b64=os.environ["FAYDA_PRIVATE_KEY"],
    redirect_uri="https://myapp.com/auth/callback",
)

@app.route("/login")
def login():
    result = client.auth.get_authorization_url()
    session["fayda_state"] = result.state
    session["fayda_verifier"] = result.code_verifier
    return redirect(result.url)

@app.route("/auth/callback")
def callback():
    user = client.userinfo.get_from_code(
        code=request.args["code"],
        state=request.args["state"],
        expected_state=session["fayda_state"],
        code_verifier=session["fayda_verifier"],
    )
    session["user"] = {"name": user.name, "sub": user.sub}
    return redirect("/dashboard")
```

---

### 6.2 Node.js Package

**Package name**: `@fayda/sdk`
**Distribution**: npm
**Min Node**: 18+
**Install**: `npm install @fayda/sdk`
**Language**: TypeScript (ships compiled JS + `.d.ts` types)

**Dependencies**:
```json
{
  "dependencies": {
    "jose": "^5.0.0",
    "node-fetch": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**Key design decisions**:
- All methods are `async`/`await`
- Uses `jose` library for JWT signing (battle-tested, supports JWK natively)
- Ships ESM + CJS dual build
- Full TypeScript types exported

**Public API surface**:
```typescript
import { FaydaClient, FaydaUser, FaydaTokens, FaydaError } from "@fayda/sdk";

const client = new FaydaClient({
  clientId: process.env.FAYDA_CLIENT_ID!,
  privateKeyBase64: process.env.FAYDA_PRIVATE_KEY!,
  redirectUri: "https://myapp.com/auth/callback",
  sandbox: false,
  acrValues: undefined,
  scopes: ["openid", "profile", "email"],
  claimsLocales: "en",
});

// Auth
const { url, state, codeVerifier } = await client.auth.getAuthorizationUrl({ claims: {...} });

// Validate callback
client.auth.validateCallback(callbackState, expectedState); // throws on mismatch

// Token exchange
const tokens: FaydaTokens = await client.token.exchange(code, codeVerifier);

// UserInfo
const user: FaydaUser = await client.userinfo.get(tokens.accessToken);

// Convenience
const user: FaydaUser = await client.userinfo.getFromCode({
  code,
  state: callbackState,
  expectedState: sessionState,
  codeVerifier: sessionVerifier,
});
```

**Express integration example**:
```typescript
import express from "express";
import { FaydaClient } from "@fayda/sdk";

const app = express();
const client = new FaydaClient({ ... });

app.get("/login", async (req, res) => {
  const { url, state, codeVerifier } = await client.auth.getAuthorizationUrl();
  req.session.faydaState = state;
  req.session.faydaVerifier = codeVerifier;
  res.redirect(url);
});

app.get("/auth/callback", async (req, res) => {
  const user = await client.userinfo.getFromCode({
    code: req.query.code as string,
    state: req.query.state as string,
    expectedState: req.session.faydaState,
    codeVerifier: req.session.faydaVerifier,
  });
  req.session.user = { name: user.name, sub: user.sub };
  res.redirect("/dashboard");
});
```

---

### 6.3 NestJS Module

**Package name**: `@fayda/sdk` (same package — NestJS module is a named export)
**Import**: `import { FaydaModule, FaydaService } from "@fayda/sdk/nestjs"`

**Key design decisions**:
- Ships as a NestJS dynamic module
- `FaydaService` wraps `FaydaClient` and is injectable
- Supports both sync and async (forRootAsync) config
- Guards and decorators for protecting routes

**Module registration**:
```typescript
// app.module.ts
import { FaydaModule } from "@fayda/sdk/nestjs";

@Module({
  imports: [
    FaydaModule.forRoot({
      clientId: process.env.FAYDA_CLIENT_ID,
      privateKeyBase64: process.env.FAYDA_PRIVATE_KEY,
      redirectUri: "https://myapp.com/auth/callback",
    }),
  ],
})
export class AppModule {}

// Async config (recommended for ConfigService)
FaydaModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    clientId: config.get("FAYDA_CLIENT_ID"),
    privateKeyBase64: config.get("FAYDA_PRIVATE_KEY"),
    redirectUri: config.get("FAYDA_REDIRECT_URI"),
  }),
  inject: [ConfigService],
})
```

**FaydaService injectable**:
```typescript
// auth.controller.ts
import { FaydaService } from "@fayda/sdk/nestjs";

@Controller("auth")
export class AuthController {
  constructor(private readonly fayda: FaydaService) {}

  @Get("login")
  async login(@Session() session: Record<string, any>, @Res() res: Response) {
    const { url, state, codeVerifier } = await this.fayda.getAuthorizationUrl();
    session.faydaState = state;
    session.faydaVerifier = codeVerifier;
    res.redirect(url);
  }

  @Get("callback")
  async callback(@Query() query, @Session() session, @Res() res: Response) {
    const user = await this.fayda.getUserFromCode({
      code: query.code,
      state: query.state,
      expectedState: session.faydaState,
      codeVerifier: session.faydaVerifier,
    });
    session.user = user;
    res.redirect("/dashboard");
  }
}
```

**@FaydaUser() decorator** (extracts current user from session):
```typescript
@Get("profile")
@UseGuards(FaydaAuthGuard)
getProfile(@FaydaUser() user: FaydaUserModel) {
  return user;
}
```

---

### 6.4 React Package

**Package name**: `@fayda/react`
**Distribution**: npm
**Install**: `npm install @fayda/react`
**Peer deps**: `react >= 18`, `@fayda/sdk`

**Key design decisions**:
- Client-side only — the React package does NOT call Fayda directly
- It redirects to your backend's `/login` endpoint, which uses `@fayda/sdk`
- `FaydaProvider` manages user state via a `/auth/me` endpoint on your backend
- Ships as ESM only (React 18+ standard)

**Architecture**:
```
React App                   Your Backend              Fayda eSignet
    │                            │                         │
    │── FaydaLoginButton ────>   │                         │
    │   (redirect to /login)     │── @fayda/sdk ─────────> │
    │                            │                         │
    │<── callback redirect ──────│<── tokens ──────────────│
    │                            │
    │── GET /auth/me ─────────>  │
    │<── { user } ───────────────│
    │
    │   useFayda().user is set
```

**Components and hooks**:
```tsx
// Provider — wrap your app
import { FaydaProvider } from "@fayda/react";

<FaydaProvider
  loginUrl="/auth/login"          // your backend login route
  logoutUrl="/auth/logout"        // your backend logout route
  meUrl="/auth/me"                // endpoint returning current user JSON
>
  <App />
</FaydaProvider>

// useFayda hook
const { user, login, logout, loading, error } = useFayda();
user     // FaydaUser | null
login()  // redirects to loginUrl
logout() // calls logoutUrl then clears user
loading  // true while fetching /auth/me on mount

// Pre-built login button
import { FaydaLoginButton } from "@fayda/react";

<FaydaLoginButton
  label="Login with Fayda ID"    // optional, has default
  className="my-btn"             // optional
  style={{}}                     // optional
/>
```

---

### 6.5 Go Package

**Module path**: `github.com/fayda-sdk/fayda-go`
**Install**: `go get github.com/fayda-sdk/fayda-go`
**Min Go**: 1.21+

**Dependencies**:
```go
// go.mod
require (
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/lestrrat-go/jwx/v2 v2.0.21
)
```

**Key design decisions**:
- Idiomatic Go: errors returned as second value, no panics
- All HTTP calls use `context.Context` for cancellation and timeouts
- Structs with functional options pattern for initialization
- No global state

**Public API surface**:
```go
package main

import (
    "context"
    "github.com/fayda-sdk/fayda-go/fayda"
)

func main() {
    client, err := fayda.NewClient(
        fayda.WithClientID("your-client-id"),
        fayda.WithPrivateKeyBase64(os.Getenv("FAYDA_PRIVATE_KEY")),
        fayda.WithRedirectURI("https://myapp.com/auth/callback"),
    )
    if err != nil {
        log.Fatal(err)
    }

    // Auth
    result, err := client.Auth.GetAuthorizationURL(ctx, nil)
    // result.URL, result.State, result.CodeVerifier

    // Validate
    err = client.Auth.ValidateCallback(callbackState, expectedState)

    // Token
    tokens, err := client.Token.Exchange(ctx, code, codeVerifier)

    // UserInfo
    user, err := client.UserInfo.Get(ctx, tokens.AccessToken)
    // user.Sub, user.Name, user.Email ...

    // Convenience
    user, err := client.UserInfo.GetFromCode(ctx, fayda.GetFromCodeParams{
        Code:          code,
        State:         callbackState,
        ExpectedState: sessionState,
        CodeVerifier:  sessionVerifier,
    })
}
```

**Types**:
```go
type FaydaUser struct {
    Sub         string   `json:"sub"`
    Name        string   `json:"name,omitempty"`
    NameAm      string   `json:"name_am,omitempty"`
    Email       string   `json:"email,omitempty"`
    PhoneNumber string   `json:"phone_number,omitempty"`
    Picture     string   `json:"picture,omitempty"`
    Gender      string   `json:"gender,omitempty"`
    Birthdate   string   `json:"birthdate,omitempty"`
    Address     *Address `json:"address,omitempty"`
}

type FaydaTokens struct {
    AccessToken string `json:"access_token"`
    IDToken     string `json:"id_token"`
    TokenType   string `json:"token_type"`
    ExpiresIn   int    `json:"expires_in"`
}

type AuthorizationResult struct {
    URL          string
    State        string
    CodeVerifier string
}
```

---

### 6.6 Rust Package

**Crate name**: `fayda-sdk`
**Distribution**: crates.io
**Install**: `cargo add fayda-sdk`
**Min Rust**: 1.75 (stable)
**Async runtime**: Tokio

**Dependencies**:
```toml
# Cargo.toml
[dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
jsonwebtoken = "9"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
base64 = "0.21"
sha2 = "0.10"
rand = "0.8"
thiserror = "1"

[features]
default = ["rustls"]
rustls = ["reqwest/rustls-tls"]
```

**Key design decisions**:
- All async using Tokio
- Strongly typed with `serde` for all serialization
- Error types use `thiserror` for idiomatic Rust errors
- Builder pattern for client initialization

**Public API surface**:
```rust
use fayda_sdk::{FaydaClient, FaydaConfig, FaydaError};

#[tokio::main]
async fn main() -> Result<(), FaydaError> {
    let client = FaydaClient::builder()
        .client_id("your-client-id")
        .private_key_base64(&std::env::var("FAYDA_PRIVATE_KEY").unwrap())
        .redirect_uri("https://myapp.com/auth/callback")
        .build()?;

    // Auth
    let auth = client.auth().get_authorization_url(None).await?;
    // auth.url, auth.state, auth.code_verifier

    // Validate
    client.auth().validate_callback(&callback_state, &expected_state)?;

    // Token
    let tokens = client.token().exchange(&code, &code_verifier).await?;

    // UserInfo
    let user = client.userinfo().get(&tokens.access_token).await?;

    // Convenience
    let user = client.userinfo().get_from_code(GetFromCodeParams {
        code: &code,
        state: &callback_state,
        expected_state: &session_state,
        code_verifier: &session_verifier,
    }).await?;

    println!("Hello, {}!", user.name.unwrap_or_default());
    Ok(())
}
```

**Error type**:
```rust
#[derive(thiserror::Error, Debug)]
pub enum FaydaError {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Auth state mismatch — possible CSRF")]
    StateMismatch,

    #[error("Token exchange failed: {code} — {description}")]
    TokenExchange { code: String, description: String },

    #[error("UserInfo fetch failed: {0}")]
    UserInfo(String),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),
}
```

---

## 7. Data Models

### FaydaUser

| Field | Type | Notes |
|---|---|---|
| `sub` | string | Unique stable Fayda user ID. Use this as your database foreign key. |
| `name` | string? | Full name in requested language |
| `name_am` | string? | Amharic name (only when `claims_locales` includes `am`) |
| `name_en` | string? | English name (only when multiple locales requested) |
| `email` | string? | May be null if user did not consent |
| `phone_number` | string? | E.164 format e.g. `+251911000000` |
| `picture` | string? | URL to profile photo hosted by Fayda |
| `gender` | string? | `male` or `female` |
| `birthdate` | string? | ISO 8601: `1990-01-15` |
| `address` | object? | See below |

**Address object**:
```
{
  formatted:      string?   -- Full address as single string
  street_address: string?
  locality:       string?   -- City/town
  region:         string?   -- Region/state
  country:        string?   -- "ET" for Ethiopia
}
```

### FaydaTokens

| Field | Type | Notes |
|---|---|---|
| `access_token` | string | Bearer token for /userinfo. Short-lived. |
| `id_token` | string | JWT with authentication claims. |
| `token_type` | string | Always `"Bearer"` |
| `expires_in` | int | Seconds until access_token expires (typically 3600) |

### AuthorizationResult

| Field | Type | Notes |
|---|---|---|
| `url` | string | Full authorization URL to redirect user to |
| `state` | string | CSRF token — MUST store in session |
| `code_verifier` | string | PKCE verifier — MUST store in session |

---

## 8. Error Codes Reference

These are the error codes returned by Fayda's token endpoint and how the SDK maps them:

| Fayda Error Code | SDK Error Class | Cause | Fix |
|---|---|---|---|
| `invalid_assertion` | `FaydaInvalidAssertionError` | JWT signing failed — wrong key, bad payload, or expired | Check private key is correct, check `iss`/`sub`/`aud` fields, check expiry is in the future |
| `invalid_transaction` | `FaydaInvalidTransactionError` | The authorization flow was interrupted | User must restart login |
| `invalid_request` | `FaydaInvalidRequestError` | Missing or malformed request params | Check `code`, `redirect_uri`, `client_id` are all present and correct |
| `invalid_client` | `FaydaInvalidClientError` | Client ID not recognized | Check client_id matches what's in partner.fayda.et |
| `access_denied` | `FaydaAccessDeniedError` | User declined consent | Show appropriate message to user |
| State mismatch | `FaydaAuthError` | CSRF protection triggered | Do not proceed — this is a security event |

---

## 9. Fayda API Endpoints

All endpoints use base URL: `https://esignet.ida.et`

> Note: Confirm exact base URL from partner.fayda.et portal before going to production. Staging and production may differ.

| Endpoint | Method | Description |
|---|---|---|
| `/authorize` | GET (redirect) | Authorization endpoint — user login |
| `/v1/esignet/oauth/token` | POST | Token exchange |
| `/v1/esignet/oidc/userinfo` | GET | Fetch user info |
| `/v1/esignet/oauth/.well-known/openid-configuration` | GET | OIDC discovery (for JWKS URL) |

**Authorization endpoint params** (full reference):

| Param | Required | Value |
|---|---|---|
| `client_id` | Yes | Your registered client ID |
| `response_type` | Yes | `code` |
| `redirect_uri` | Yes | Must match registered URI exactly |
| `scope` | Yes | `openid profile email` (or `openid` for yes/no auth) |
| `state` | Yes | Random CSRF token |
| `code_challenge` | Yes | BASE64URL(SHA256(code_verifier)) |
| `code_challenge_method` | Yes | `S256` |
| `claims` | No | URL-encoded JSON of requested claims |
| `claims_locales` | No | Space-separated language codes: `en am` |
| `acr_values` | No | `mosip:idp:acr:generated-code` (OTP) or `mosip:idp:acr:generated-code:biometrics` |

---

## 10. Sandbox / Mock Mode

All packages support sandbox mode. When `sandbox=True`:

- `auth.get_authorization_url()` returns a fake URL (no network call)
- `token.exchange()` returns fake tokens (no network call)
- `userinfo.get()` returns mock `FaydaUser` (no network call)
- `userinfo.get_mock()` is also available directly

**Mock user returned in sandbox mode**:
```json
{
  "sub": "mock-fayda-id-000001",
  "name": "Abebe Bikila",
  "name_am": "አበበ ቢኪላ",
  "email": "abebe.bikila@example.com",
  "phone_number": "+251911000000",
  "gender": "male",
  "birthdate": "1932-08-07",
  "picture": "https://placehold.co/150x150?text=AB",
  "address": {
    "formatted": "Addis Ababa, Ethiopia",
    "locality": "Addis Ababa",
    "country": "ET"
  }
}
```

Sandbox mode raises `FaydaSandboxError` if you call any method that would require real credentials in a non-sandbox context.

---

## 11. CI/CD & Publishing

### GitHub Actions — Per Language

**Python** (`.github/workflows/python.yml`):
```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.9", "3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -e "packages/python[dev]"
      - run: pytest packages/python/tests -v
  publish:
    if: startsWith(github.ref, 'refs/tags/python-v')
    needs: test
    steps:
      - run: pip install build twine
      - run: python -m build packages/python
      - run: twine upload dist/*
        env:
          TWINE_TOKEN: ${{ secrets.PYPI_TOKEN }}
```

**Node.js** (`.github/workflows/node.yml`):
```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: ["18", "20", "22"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci --prefix packages/node
      - run: npm test --prefix packages/node
  publish:
    if: startsWith(github.ref, 'refs/tags/node-v')
    needs: test
    steps:
      - run: npm publish packages/node
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Version Tagging Strategy

Tags trigger publishing:
- `python-v0.1.0` → publishes Python to PyPI
- `node-v0.1.0` → publishes Node + NestJS + React to npm
- `go-v0.1.0` → creates Go module tag
- `rust-v0.1.0` → publishes to crates.io

---

## 12. Testing Strategy

### Unit Tests (per package)

Each package must test:

1. **PKCE generation** — `code_verifier` is 43–128 chars, URL-safe; `code_challenge` is correct SHA-256 hash
2. **Authorization URL** — all required params present, claims URL-encoded correctly
3. **State validation** — mismatched state raises `FaydaAuthError`
4. **JWT signing** — client assertion JWT has correct `iss`, `sub`, `aud`, `exp > iat`
5. **Token parsing** — mock HTTP response parsed into `FaydaTokens`
6. **UserInfo decoding** — mock JWT decoded into `FaydaUser`, multilingual fields handled
7. **Error mapping** — each Fayda error code maps to correct SDK error class
8. **Sandbox mode** — all methods return mock data, no network calls made

### Shared Test Fixtures (`tests/fixtures/`)

```
mock_id_token.jwt       -- A pre-signed JWT with known payload for decode testing
mock_userinfo.json      -- Expected FaydaUser output after decoding mock_id_token
mock_jwk.json           -- Test RSA JWK (NOT a real key — for unit tests only)
mock_token_response.json  -- Fayda token endpoint success response
mock_error_response.json  -- Fayda token endpoint error response
```

### Integration Tests

A separate `tests/integration/` directory (not run in CI by default) tests against the Fayda staging environment using real credentials loaded from environment variables.

---

## 13. Claude Code Build Instructions

> Hand this section to Claude Code when starting the build.

### How To Use This Document

This file is the complete specification. Do not deviate from the API surface defined in Section 4 and Section 6. All public method names, parameter names, and return types are final.

### Build Order

Build in this order to avoid rework:

1. **Shared fixtures** (`tests/fixtures/`) — create mock JWT, mock user JSON, mock JWK
2. **Python package** — most readable, fastest to prototype and test
3. **Node.js package** — same logic as Python, TypeScript types
4. **NestJS module** — thin wrapper over Node.js package
5. **React package** — client-side only, thin wrapper
6. **Go package** — idiomatic Go rewrite of the same logic
7. **Rust package** — idiomatic Rust rewrite

### Per-Package Checklist

For each package, implement in this order:

- [ ] `config` — config struct/dataclass/struct with all init params and endpoint URLs
- [ ] `models` — `FaydaUser`, `FaydaTokens`, `AuthorizationResult` types
- [ ] `errors` — all error classes with the hierarchy from Section 5.4
- [ ] `auth` — PKCE generation, URL building, state validation
- [ ] `token` — JWT signing, HTTP POST, response parsing
- [ ] `userinfo` — HTTP GET, JWT decoding, model mapping
- [ ] `client` — top-level entry point wiring all modules together
- [ ] `sandbox` — mock mode implementation
- [ ] `tests` — unit tests for all of the above
- [ ] `README.md` — quickstart for that language

### Critical Implementation Notes

**PKCE**:
- `code_verifier` must use URL-safe base64 WITHOUT padding (strip `=`)
- `code_challenge` = `BASE64URL(SHA256(code_verifier))` also without padding
- Use `secrets.token_urlsafe` or `crypto.randomBytes` — NOT `Math.random()`

**Private key decoding** (same in all languages):
```
1. Take the base64 string
2. base64_decode → UTF-8 string
3. JSON.parse → JWK object (has kty, n, e, d, p, q, dp, dq, qi)
4. Import using the language's crypto/JWT library
5. Sign JWT with RS256
```

**State comparison**: Always use constant-time comparison to prevent timing attacks:
- Python: `secrets.compare_digest(a, b)`
- Node: `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`
- Go: `subtle.ConstantTimeCompare([]byte(a), []byte(b))`
- Rust: `constant_time_eq::constant_time_eq(a.as_bytes(), b.as_bytes())`

**Claims URL-encoding**: The `claims` parameter must be `JSON.stringify`-ed then URL-encoded:
```
claims_json = JSON.stringify(claims_object)
url_param = encodeURIComponent(claims_json)
```

**Multilingual userinfo**: When `claims_locales` contains multiple languages (e.g. `"en am"`), the `/userinfo` JWT contains fields like `name#en` and `name#am`. Map these to `name_en` and `name_am` on `FaydaUser`.

**Token endpoint Content-Type**: Must be `application/x-www-form-urlencoded`, NOT `application/json`.

### Environment Variables Convention

All examples and READMEs should use these env var names:
```
FAYDA_CLIENT_ID         -- Your eSignet client ID
FAYDA_PRIVATE_KEY       -- Base64-encoded JWK private key
FAYDA_REDIRECT_URI      -- OAuth callback URL
FAYDA_SANDBOX           -- "true" to enable sandbox mode
```

### README Template (per package)

Each package README must contain in order:
1. One-line description
2. Install command
3. Minimal working example (< 15 lines)
4. Link to full docs
5. Environment variables table
6. Error handling example
7. Link to contributing guide

---

*End of specification. Version 1.0 — June 2026*
