package fayda

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"net/url"
	"strings"
	"testing"
)

func testConfig() *Config {
	return &Config{
		ClientID:         "test-client",
		PrivateKeyBase64: "dGVzdA==",
		RedirectURI:      "http://localhost/callback",
		Sandbox:          false,
		Scopes:           []string{"openid", "profile", "email"},
		ClaimsLocales:    "en",
		BaseURL:          "https://esignet.ida.et",
	}
}

func TestPKCEVerifierLength(t *testing.T) {
	auth := &AuthModule{config: testConfig()}
	result, err := auth.GetAuthorizationURL(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.CodeVerifier) < 43 || len(result.CodeVerifier) > 128 {
		t.Errorf("code_verifier length %d not in [43,128]", len(result.CodeVerifier))
	}
}

func TestPKCEVerifierURLSafe(t *testing.T) {
	auth := &AuthModule{config: testConfig()}
	result, err := auth.GetAuthorizationURL(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(result.CodeVerifier, "+") ||
		strings.Contains(result.CodeVerifier, "/") ||
		strings.Contains(result.CodeVerifier, "=") {
		t.Errorf("code_verifier contains invalid chars: %s", result.CodeVerifier)
	}
}

func TestPKCEChallengeIsSHA256(t *testing.T) {
	auth := &AuthModule{config: testConfig()}
	result, err := auth.GetAuthorizationURL(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(result.URL)
	if err != nil {
		t.Fatal(err)
	}
	challenge := parsed.Query().Get("code_challenge")
	hash := sha256.Sum256([]byte(result.CodeVerifier))
	expected := base64.RawURLEncoding.EncodeToString(hash[:])
	if challenge != expected {
		t.Errorf("code_challenge mismatch: got %s, want %s", challenge, expected)
	}
}

func TestAuthorizationURLRequiredParams(t *testing.T) {
	auth := &AuthModule{config: testConfig()}
	result, err := auth.GetAuthorizationURL(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(result.URL)
	if err != nil {
		t.Fatal(err)
	}
	q := parsed.Query()

	checks := map[string]string{
		"response_type":         "code",
		"client_id":             "test-client",
		"redirect_uri":          "http://localhost/callback",
		"code_challenge_method": "S256",
		"state":                 result.State,
	}
	for k, want := range checks {
		got := q.Get(k)
		if got != want {
			t.Errorf("param %s: got %q, want %q", k, got, want)
		}
	}
	if !strings.Contains(q.Get("scope"), "openid") {
		t.Error("scope should contain 'openid'")
	}
}

func TestValidateCallbackSuccess(t *testing.T) {
	auth := &AuthModule{config: testConfig()}
	if err := auth.ValidateCallback("abc123", "abc123"); err != nil {
		t.Errorf("expected no error, got: %v", err)
	}
}

func TestValidateCallbackMismatch(t *testing.T) {
	auth := &AuthModule{config: testConfig()}
	err := auth.ValidateCallback("state1", "state2")
	if err == nil {
		t.Error("expected error on state mismatch")
	}
	if _, ok := err.(*AuthError); !ok {
		t.Errorf("expected *AuthError, got %T", err)
	}
}

func TestSandboxExchange(t *testing.T) {
	cfg := testConfig()
	cfg.Sandbox = true
	tm := &TokenModule{config: cfg, http: nil}
	tokens, err := tm.Exchange(context.Background(), "code", "verifier")
	if err != nil {
		t.Fatal(err)
	}
	if tokens.AccessToken != "mock-access-token-abc123def456" {
		t.Errorf("unexpected access token: %s", tokens.AccessToken)
	}
}

func TestSandboxUserInfo(t *testing.T) {
	cfg := testConfig()
	cfg.Sandbox = true
	ui := &UserInfoModule{config: cfg}
	user, err := ui.Get(context.Background(), "any-token")
	if err != nil {
		t.Fatal(err)
	}
	if user.Sub != "mock-fayda-id-000001" {
		t.Errorf("unexpected sub: %s", user.Sub)
	}
	if user.NameAm != "አበበ ቢኪላ" {
		t.Errorf("unexpected name_am: %s", user.NameAm)
	}
}

func TestGetMockOutsideSandbox(t *testing.T) {
	ui := &UserInfoModule{config: testConfig()}
	_, err := ui.GetMock()
	if err == nil {
		t.Error("expected error outside sandbox")
	}
	if _, ok := err.(*SandboxError); !ok {
		t.Errorf("expected *SandboxError, got %T", err)
	}
}

func TestMapTokenError(t *testing.T) {
	cases := []struct {
		code    string
		wantErr interface{}
	}{
		{"invalid_assertion", &InvalidAssertionError{}},
		{"invalid_transaction", &InvalidTransactionError{}},
		{"invalid_request", &InvalidRequestError{}},
		{"unknown_code", &TokenError{}},
	}
	for _, tc := range cases {
		err := MapTokenError(tc.code, "desc")
		switch tc.wantErr.(type) {
		case *InvalidAssertionError:
			if _, ok := err.(*InvalidAssertionError); !ok {
				t.Errorf("code %s: got %T, want *InvalidAssertionError", tc.code, err)
			}
		case *InvalidTransactionError:
			if _, ok := err.(*InvalidTransactionError); !ok {
				t.Errorf("code %s: got %T, want *InvalidTransactionError", tc.code, err)
			}
		case *InvalidRequestError:
			if _, ok := err.(*InvalidRequestError); !ok {
				t.Errorf("code %s: got %T, want *InvalidRequestError", tc.code, err)
			}
		case *TokenError:
			if _, ok := err.(*TokenError); !ok {
				t.Errorf("code %s: got %T, want *TokenError", tc.code, err)
			}
		}
	}
}
