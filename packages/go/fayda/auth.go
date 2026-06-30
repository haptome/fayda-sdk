package fayda

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"net/url"
)

// AuthModule handles authorization flows
type AuthModule struct {
	config *Config
}

// GetAuthorizationURL generates an authorization URL with PKCE
func (a *AuthModule) GetAuthorizationURL(ctx context.Context, claims map[string]interface{}) (*AuthorizationResult, error) {
	// Generate PKCE code_verifier
	verifierBytes := make([]byte, 64)
	if _, err := rand.Read(verifierBytes); err != nil {
		return nil, err
	}
	codeVerifier := base64.RawURLEncoding.EncodeToString(verifierBytes)

	// Generate code_challenge
	hash := sha256.Sum256([]byte(codeVerifier))
	codeChallenge := base64.RawURLEncoding.EncodeToString(hash[:])

	// Generate state
	stateBytes := make([]byte, 32)
	if _, err := rand.Read(stateBytes); err != nil {
		return nil, err
	}
	state := base64.RawURLEncoding.EncodeToString(stateBytes)

	// Build query parameters
	params := url.Values{
		"response_type":             {"code"},
		"client_id":                 {a.config.ClientID},
		"redirect_uri":              {a.config.RedirectURI},
		"scope":                     {joinStrings(a.config.Scopes, " ")},
		"code_challenge":            {codeChallenge},
		"code_challenge_method":     {"S256"},
		"state":                     {state},
	}

	if a.config.ACRValues != "" {
		params.Set("acr_values", a.config.ACRValues)
	}

	if a.config.ClaimsLocales != "" {
		params.Set("claims_locales", a.config.ClaimsLocales)
	}

	if claims != nil {
		claimsJSON, err := json.Marshal(claims)
		if err != nil {
			return nil, err
		}
		params.Set("claims", string(claimsJSON))
	}

	authURL := a.config.AuthorizationEndpoint() + "?" + params.Encode()

	return &AuthorizationResult{
		URL:          authURL,
		State:        state,
		CodeVerifier: codeVerifier,
	}, nil
}

// ValidateCallback validates the OAuth callback state (CSRF protection)
func (a *AuthModule) ValidateCallback(callbackState, expectedState string) error {
	if subtle.ConstantTimeCompare([]byte(callbackState), []byte(expectedState)) != 1 {
		return &AuthError{Message: "state mismatch — possible CSRF attack"}
	}
	return nil
}

// Helper function to join strings
func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
