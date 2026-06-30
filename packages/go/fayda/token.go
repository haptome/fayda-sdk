package fayda

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type cachedPublicKey struct {
	Kid string
	Key *rsa.PublicKey
}

// TokenModule handles token exchange and verification
type TokenModule struct {
	config    *Config
	http      *http.Client
	jwksMu    sync.Mutex
	jwksKeys  []cachedPublicKey
	jwksExp   time.Time
}

// Exchange exchanges an authorization code for tokens
func (t *TokenModule) Exchange(ctx context.Context, code, codeVerifier string) (*FaydaTokens, error) {
	if t.config.Sandbox {
		return &FaydaTokens{
			AccessToken: "mock-access-token-abc123def456",
			IDToken:     "mock-id-token-xyz789uvw012",
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}, nil
	}

	assertion, err := t.buildClientAssertion()
	if err != nil {
		return nil, err
	}

	form := url.Values{
		"grant_type":            {"authorization_code"},
		"client_id":             {t.config.ClientID},
		"code":                  {code},
		"redirect_uri":          {t.config.RedirectURI},
		"code_verifier":         {codeVerifier},
		"client_assertion_type": {"urn:ietf:params:oauth:client-assertion-type:jwt-bearer"},
		"client_assertion":      {assertion},
	}

	req, err := http.NewRequestWithContext(ctx, "POST", t.config.TokenEndpoint(), strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := t.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		json.Unmarshal(body, &errResp)
		errCode := ""
		if c, ok := errResp["error"].(string); ok {
			errCode = c
		}
		description := ""
		if d, ok := errResp["error_description"].(string); ok {
			description = d
		}
		return nil, MapTokenError(errCode, description)
	}

	var tokens FaydaTokens
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, err
	}

	return &tokens, nil
}

// rsaJWK is a minimal JWK representation for RSA private keys
type rsaJWK struct {
	N  string `json:"n"`
	E  string `json:"e"`
	D  string `json:"d"`
	P  string `json:"p"`
	Q  string `json:"q"`
	Dp string `json:"dp"`
	Dq string `json:"dq"`
	Qi string `json:"qi"`
}

// parseRSAPrivateKey parses a JWK JSON blob into an *rsa.PrivateKey using stdlib only
func parseRSAPrivateKey(jwkBytes []byte) (*rsa.PrivateKey, error) {
	var k rsaJWK
	if err := json.Unmarshal(jwkBytes, &k); err != nil {
		return nil, fmt.Errorf("invalid JWK JSON: %w", err)
	}

	decodeBigInt := func(field, b64 string) (*big.Int, error) {
		if b64 == "" {
			return nil, fmt.Errorf("JWK missing required field: %s", field)
		}
		b, err := base64.RawURLEncoding.DecodeString(b64)
		if err != nil {
			return nil, fmt.Errorf("JWK field %s: %w", field, err)
		}
		return new(big.Int).SetBytes(b), nil
	}

	n, err := decodeBigInt("n", k.N)
	if err != nil {
		return nil, err
	}
	e, err := decodeBigInt("e", k.E)
	if err != nil {
		return nil, err
	}
	d, err := decodeBigInt("d", k.D)
	if err != nil {
		return nil, err
	}
	p, err := decodeBigInt("p", k.P)
	if err != nil {
		return nil, err
	}
	q, err := decodeBigInt("q", k.Q)
	if err != nil {
		return nil, err
	}
	dp, err := decodeBigInt("dp", k.Dp)
	if err != nil {
		return nil, err
	}
	dq, err := decodeBigInt("dq", k.Dq)
	if err != nil {
		return nil, err
	}
	qi, err := decodeBigInt("qi", k.Qi)
	if err != nil {
		return nil, err
	}

	key := &rsa.PrivateKey{
		PublicKey: rsa.PublicKey{
			N: n,
			E: int(e.Int64()),
		},
		D:      d,
		Primes: []*big.Int{p, q},
		Precomputed: rsa.PrecomputedValues{
			Dp:   dp,
			Dq:   dq,
			Qinv: qi,
		},
	}

	if err := key.Validate(); err != nil {
		return nil, fmt.Errorf("RSA key validation failed: %w", err)
	}

	return key, nil
}

// buildClientAssertion builds the RS256-signed JWT client assertion
func (t *TokenModule) buildClientAssertion() (string, error) {
	// Decode base64-encoded JWK string
	jwkBytes, err := base64.StdEncoding.DecodeString(t.config.PrivateKeyBase64)
	if err != nil {
		return "", fmt.Errorf("failed to decode private key base64: %w", err)
	}

	rsaKey, err := parseRSAPrivateKey(jwkBytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse JWK: %w", err)
	}

	now := time.Now()
	claims := jwt.MapClaims{
		"iss": t.config.ClientID,
		"sub": t.config.ClientID,
		"aud": t.config.TokenEndpoint(),
		"iat": now.Unix(),
		"exp": now.Add(2 * time.Hour).Unix(),
		"jti": generateUUID(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(rsaKey)
}

// fetchJWKS fetches and caches Fayda's public JWKS (1-hour TTL)
func (t *TokenModule) fetchJWKS(ctx context.Context) ([]cachedPublicKey, error) {
	t.jwksMu.Lock()
	defer t.jwksMu.Unlock()

	if !t.jwksExp.IsZero() && time.Now().Before(t.jwksExp) {
		return t.jwksKeys, nil
	}

	// 1. Discovery document → jwks_uri
	req, _ := http.NewRequestWithContext(ctx, "GET", t.config.DiscoveryEndpoint(), nil)
	resp, err := t.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("discovery fetch failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var discovery map[string]interface{}
	if err := json.Unmarshal(body, &discovery); err != nil {
		return nil, fmt.Errorf("discovery parse failed: %w", err)
	}
	jwksURI, _ := discovery["jwks_uri"].(string)
	if jwksURI == "" {
		return nil, fmt.Errorf("jwks_uri not found in discovery document")
	}

	// 2. Fetch JWKS
	req2, _ := http.NewRequestWithContext(ctx, "GET", jwksURI, nil)
	resp2, err := t.http.Do(req2)
	if err != nil {
		return nil, fmt.Errorf("JWKS fetch failed: %w", err)
	}
	defer resp2.Body.Close()
	body2, _ := io.ReadAll(resp2.Body)
	var jwks struct {
		Keys []map[string]interface{} `json:"keys"`
	}
	if err := json.Unmarshal(body2, &jwks); err != nil {
		return nil, fmt.Errorf("JWKS parse failed: %w", err)
	}

	// 3. Parse RSA public keys
	var keys []cachedPublicKey
	for _, k := range jwks.Keys {
		if k["kty"] != "RSA" {
			continue
		}
		nStr, _ := k["n"].(string)
		eStr, _ := k["e"].(string)
		nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
		if err != nil {
			continue
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
		if err != nil {
			continue
		}
		kid, _ := k["kid"].(string)
		keys = append(keys, cachedPublicKey{
			Kid: kid,
			Key: &rsa.PublicKey{
				N: new(big.Int).SetBytes(nBytes),
				E: int(new(big.Int).SetBytes(eBytes).Int64()),
			},
		})
	}

	t.jwksKeys = keys
	t.jwksExp = time.Now().Add(time.Hour)
	return keys, nil
}

// Verify verifies an ID token's RS256 signature against Fayda's public JWKS.
// Returns the decoded MapClaims on success.
func (t *TokenModule) Verify(ctx context.Context, idToken string) (jwt.MapClaims, error) {
	keys, err := t.fetchJWKS(ctx)
	if err != nil {
		return nil, err
	}
	var lastErr error
	for _, k := range keys {
		entry := k
		token, err := jwt.Parse(idToken, func(tok *jwt.Token) (interface{}, error) {
			if _, ok := tok.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", tok.Header["alg"])
			}
			if kid, ok := tok.Header["kid"].(string); ok && entry.Kid != "" && kid != entry.Kid {
				return nil, fmt.Errorf("kid mismatch")
			}
			return entry.Key, nil
		}, jwt.WithAudience(t.config.ClientID))
		if err == nil && token.Valid {
			return token.Claims.(jwt.MapClaims), nil
		}
		lastErr = err
	}
	if lastErr != nil {
		return nil, fmt.Errorf("ID token verification failed: %w", lastErr)
	}
	return nil, fmt.Errorf("no valid JWKS key found for token")
}

// generateUUID returns a random RFC 4122 version 4 UUID
func generateUUID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(fmt.Sprintf("crypto/rand failed: %v", err))
	}
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant bits
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
