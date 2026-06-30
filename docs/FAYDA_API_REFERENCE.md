# Fayda eSignet API Reference

> Raw API reference for VeriFayda 2.0 (eSignet). This is what the SDK wraps.
> Source: https://id.gov.et/api and https://nidp.atlassian.net/wiki

---

## Base URLs

| Environment | Base URL |
|---|---|
| Production | `https://esignet.ida.et` |
| Partner Portal | `https://partner.fayda.et` |
| API Info | `https://id.gov.et/api` |

---

## Authentication Methods

Fayda supports three OIDC authentication contexts via `acr_values`:

| acr_value | Method |
|---|---|
| *(omit)* | Fayda default (user chooses) |
| `mosip:idp:acr:generated-code` | OTP only |
| `mosip:idp:acr:generated-code:biometrics` | OTP or biometrics |

---

## Endpoint 1 — Authorization

Redirect the user's browser to this endpoint to start the login flow.

```
GET https://esignet.ida.et/authorize
```

**Query Parameters**:

| Parameter | Required | Description |
|---|---|---|
| `client_id` | Yes | Your registered client ID |
| `response_type` | Yes | Must be `code` |
| `redirect_uri` | Yes | Must exactly match registered callback URL |
| `scope` | Yes | Space-separated: `openid profile email` |
| `state` | Yes | Random string for CSRF protection |
| `code_challenge` | Yes | `BASE64URL(SHA256(code_verifier))` — no padding |
| `code_challenge_method` | Yes | Must be `S256` |
| `claims` | No | URL-encoded JSON of requested claims |
| `claims_locales` | No | Space-separated: `en` or `en am` |
| `acr_values` | No | See authentication methods above |

**Callback** (Fayda redirects to your `redirect_uri`):

Success:
```
GET https://yourapp.com/callback?code=AUTH_CODE&state=YOUR_STATE
```

Error:
```
GET https://yourapp.com/callback?error=ERROR_CODE&error_description=DESCRIPTION
```

---

## Endpoint 2 — Token Exchange

Exchange authorization code for tokens. Called from your backend (never from the browser).

```
POST https://esignet.ida.et/v1/esignet/oauth/token
Content-Type: application/x-www-form-urlencoded
```

**Body Parameters**:

| Parameter | Required | Description |
|---|---|---|
| `grant_type` | Yes | Must be `authorization_code` |
| `code` | Yes | Authorization code from callback |
| `redirect_uri` | Yes | Same URI used in authorization request |
| `client_id` | Yes | Your client ID |
| `client_assertion` | Yes | Signed JWT (see below) |
| `client_assertion_type` | Yes | `urn:ietf:params:oauth:client-assertion-type:jwt-bearer` |
| `code_verifier` | Yes | Original code verifier (not the challenge) |

**Client Assertion JWT**:

Header:
```json
{ "alg": "RS256", "typ": "JWT" }
```

Payload:
```json
{
  "iss": "YOUR_CLIENT_ID",
  "sub": "YOUR_CLIENT_ID",
  "aud": "https://esignet.ida.et/v1/esignet/oauth/token",
  "iat": 1700000000,
  "exp": 1700007200
}
```

Signed with your RSA private key using RS256.

**Success Response** `200 OK`:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Error Response** `4xx`:
```json
{
  "error": "invalid_assertion",
  "error_description": "Signature verification failed"
}
```

**Token Error Codes**:

| Code | Meaning |
|---|---|
| `invalid_assertion` | JWT signature bad, or iss/sub/aud/exp wrong |
| `invalid_transaction` | Flow was interrupted (user navigated away, etc.) |
| `invalid_request` | Missing or malformed body params |
| `invalid_client` | Client ID not registered |

---

## Endpoint 3 — UserInfo

Retrieve the authenticated user's profile using the access token.

```
GET https://esignet.ida.et/v1/esignet/oidc/userinfo
Authorization: Bearer ACCESS_TOKEN
```

**Response**: A signed JWT string (not JSON directly).

Decode the JWT to get the payload:

```json
{
  "sub": "unique-fayda-id",
  "name": "Abebe Bikila",
  "email": "abebe@example.com",
  "phone_number": "+251911000000",
  "picture": "https://...",
  "gender": "male",
  "birthdate": "1932-08-07",
  "address": {
    "formatted": "Addis Ababa, Ethiopia",
    "locality": "Addis Ababa",
    "country": "ET"
  },
  "iss": "https://esignet.ida.et",
  "aud": "your-client-id",
  "iat": 1700000000,
  "exp": 1700003600
}
```

**Multilingual fields** (when `claims_locales: "en am"` was set):

```json
{
  "sub": "unique-fayda-id",
  "name#en": "Abebe Bikila",
  "name#am": "አበበ ቢኪላ",
  "address#en": { "formatted": "Addis Ababa, Ethiopia" },
  "address#am": { "formatted": "አዲስ አበባ፣ ኢትዮጵያ" }
}
```

---

## Claims Reference

Claims you can request in the `claims` parameter:

| Claim | Type | Description |
|---|---|---|
| `name` | string | Full name |
| `email` | string | Email address |
| `phone_number` | string | Phone in E.164 format |
| `picture` | string | URL to profile photo |
| `gender` | string | `male` or `female` |
| `birthdate` | string | ISO 8601 date |
| `address` | object | Structured address |

**Claims JSON format**:
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

`"essential": true` means the user cannot skip providing this field during consent.

For yes/no verification only (no user data), use `scope: "openid"` and omit `claims`.

---

## Private Key Format

Fayda provides your private key as a **Base64-encoded JWK set**.

Decoding steps:
```
1. base64_decode(private_key_string) → UTF-8 bytes
2. UTF-8 decode → JSON string
3. JSON.parse → JWK object
```

JWK object structure:
```json
{
  "kty": "RSA",
  "n": "...",   // modulus (base64url)
  "e": "AQAB", // public exponent
  "d": "...",   // private exponent
  "p": "...",   // first prime
  "q": "...",   // second prime
  "dp": "...",  // first CRT exponent
  "dq": "...",  // second CRT exponent
  "qi": "...",  // CRT coefficient
  "kid": "..."  // key ID
}
```

---

## OIDC Discovery

Fayda publishes an OIDC discovery document:
```
GET https://esignet.ida.et/v1/esignet/oauth/.well-known/openid-configuration
```

Contains: `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`, supported scopes, ACR values, etc.

Use the `jwks_uri` from this document to verify the signature of ID tokens and userinfo JWTs (optional but recommended for production).

---

## Getting Credentials

1. Go to `https://partner.fayda.et`
2. Register your organization
3. Complete the onboarding review (Fayda team approves)
4. Receive: `client_id` and `private_key` (Base64 JWK)
5. Register your `redirect_uri` in the portal

Support: `api_support@id.et`

---

*Source: id.gov.et/api — Last verified June 2026*
