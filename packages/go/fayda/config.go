package fayda

import (
	"fmt"
	"net/url"
)

// Config holds the Fayda client configuration
type Config struct {
	ClientID          string
	PrivateKeyBase64  string
	RedirectURI       string
	Sandbox           bool
	ACRValues         string
	Scopes            []string
	ClaimsLocales     string
	BaseURL           string
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.ClientID == "" {
		return &ConfigError{message: "clientId is required"}
	}
	if c.PrivateKeyBase64 == "" {
		return &ConfigError{message: "privateKeyBase64 is required"}
	}
	if c.RedirectURI == "" {
		return &ConfigError{message: "redirectUri is required"}
	}

	// Validate redirect_uri is a valid URL
	if _, err := url.Parse(c.RedirectURI); err != nil {
		return &ConfigError{message: fmt.Sprintf("invalid redirectUri: %v", err)}
	}

	return nil
}

// AuthorizationEndpoint returns the authorization endpoint URL
func (c *Config) AuthorizationEndpoint() string {
	return c.BaseURL + "/authorize"
}

// TokenEndpoint returns the token endpoint URL
func (c *Config) TokenEndpoint() string {
	return c.BaseURL + "/v1/esignet/oauth/token"
}

// UserInfoEndpoint returns the userinfo endpoint URL
func (c *Config) UserInfoEndpoint() string {
	return c.BaseURL + "/v1/esignet/oidc/userinfo"
}

// DiscoveryEndpoint returns the OIDC discovery document URL
func (c *Config) DiscoveryEndpoint() string {
	return c.BaseURL + "/v1/esignet/oauth/.well-known/openid-configuration"
}
