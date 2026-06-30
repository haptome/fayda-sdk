package fayda

import (
	"net/http"
	"time"
)

const (
	DefaultBaseURL = "https://esignet.ida.et"
)

// Client is the main Fayda SDK client
type Client struct {
	config *Config
	http   *http.Client
	Auth   *AuthModule
	Token  *TokenModule
	UserInfo *UserInfoModule
}

// Option is a functional option for configuring the client
type Option func(*Config) error

// WithClientID sets the client ID
func WithClientID(id string) Option {
	return func(c *Config) error {
		c.ClientID = id
		return nil
	}
}

// WithPrivateKeyBase64 sets the private key (base64-encoded JWK)
func WithPrivateKeyBase64(key string) Option {
	return func(c *Config) error {
		c.PrivateKeyBase64 = key
		return nil
	}
}

// WithRedirectURI sets the OAuth redirect URI
func WithRedirectURI(uri string) Option {
	return func(c *Config) error {
		c.RedirectURI = uri
		return nil
	}
}

// WithSandbox enables sandbox mode (no network calls)
func WithSandbox(sandbox bool) Option {
	return func(c *Config) error {
		c.Sandbox = sandbox
		return nil
	}
}

// WithACRValues sets authentication context
func WithACRValues(acr string) Option {
	return func(c *Config) error {
		c.ACRValues = acr
		return nil
	}
}

// WithScopes sets OAuth scopes
func WithScopes(scopes []string) Option {
	return func(c *Config) error {
		c.Scopes = scopes
		return nil
	}
}

// WithClaimsLocales sets language preferences
func WithClaimsLocales(locales string) Option {
	return func(c *Config) error {
		c.ClaimsLocales = locales
		return nil
	}
}

// NewClient creates a new Fayda SDK client
func NewClient(opts ...Option) (*Client, error) {
	cfg := &Config{
		BaseURL:       DefaultBaseURL,
		Scopes:        []string{"openid", "profile", "email"},
		ClaimsLocales: "en",
	}

	for _, opt := range opts {
		if err := opt(cfg); err != nil {
			return nil, err
		}
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	client := &Client{
		config: cfg,
		http:   httpClient,
	}

	client.Auth = &AuthModule{config: cfg}
	client.Token = &TokenModule{config: cfg, http: httpClient}
	client.UserInfo = &UserInfoModule{
		config: cfg,
		http:   httpClient,
		auth:   client.Auth,
		token:  client.Token,
	}

	return client, nil
}

// Close closes the HTTP client
func (c *Client) Close() error {
	c.http.CloseIdleConnections()
	return nil
}

// MockUser returns a mock user for testing in sandbox mode
func MockUser() *FaydaUser {
	return &FaydaUser{
		Sub:         "mock-fayda-id-000001",
		Name:        "Abebe Bikila",
		NameAm:      "አበበ ቢኪላ",
		NameEn:      "Abebe Bikila",
		Email:       "abebe.bikila@example.com",
		PhoneNumber: "+251911000000",
		Picture:     "https://placehold.co/150x150?text=AB",
		Gender:      "male",
		Birthdate:   "1932-08-07",
		Address: &FaydaAddress{
			Formatted: "Addis Ababa, Ethiopia",
			Locality:  "Addis Ababa",
			Country:   "ET",
		},
	}
}
