package fayda

// FaydaTokens represents OAuth tokens
type FaydaTokens struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// FaydaAddress represents a user's address
type FaydaAddress struct {
	Formatted     string `json:"formatted,omitempty"`
	StreetAddress string `json:"street_address,omitempty"`
	Locality      string `json:"locality,omitempty"`
	Region        string `json:"region,omitempty"`
	Country       string `json:"country,omitempty"`
}

// FaydaUser represents an authenticated user
type FaydaUser struct {
	Sub         string        `json:"sub"`
	Name        string        `json:"name,omitempty"`
	NameAm      string        `json:"name_am,omitempty"`
	NameEn      string        `json:"name_en,omitempty"`
	Email       string        `json:"email,omitempty"`
	PhoneNumber string        `json:"phone_number,omitempty"`
	Picture     string        `json:"picture,omitempty"`
	Gender      string        `json:"gender,omitempty"`
	Birthdate   string        `json:"birthdate,omitempty"`
	Address     *FaydaAddress `json:"address,omitempty"`
}

// AuthorizationResult represents the result of authorization URL generation
type AuthorizationResult struct {
	URL          string
	State        string
	CodeVerifier string
}

// GetFromCodeParams represents parameters for GetFromCode method
type GetFromCodeParams struct {
	Code          string
	State         string
	ExpectedState string
	CodeVerifier  string
}
