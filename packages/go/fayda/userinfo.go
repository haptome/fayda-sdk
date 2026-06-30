package fayda

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
)

// UserInfoModule handles userinfo fetching
type UserInfoModule struct {
	config *Config
	http   *http.Client
	auth   *AuthModule
	token  *TokenModule
}

// Get fetches the user's information using an access token
func (u *UserInfoModule) Get(ctx context.Context, accessToken string) (*FaydaUser, error) {
	if u.config.Sandbox {
		return MockUser(), nil
	}

	req, err := http.NewRequestWithContext(ctx, "GET", u.config.UserInfoEndpoint(), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	resp, err := u.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, &UserInfoError{message: fmt.Sprintf("userinfo request failed: %d", resp.StatusCode)}
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// The response is a JWT, decode it without verification
	token, _, err := jwt.NewParser().ParseUnverified(string(body), jwt.MapClaims{})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims format")
	}

	return mapClaimsToUser(claims)
}

// GetFromCode gets the user's information from an authorization code
func (u *UserInfoModule) GetFromCode(ctx context.Context, params GetFromCodeParams) (*FaydaUser, error) {
	if err := u.auth.ValidateCallback(params.State, params.ExpectedState); err != nil {
		return nil, err
	}

	tokens, err := u.token.Exchange(ctx, params.Code, params.CodeVerifier)
	if err != nil {
		return nil, err
	}

	return u.Get(ctx, tokens.AccessToken)
}

// GetMock returns a mock user (sandbox mode only)
func (u *UserInfoModule) GetMock() (*FaydaUser, error) {
	if !u.config.Sandbox {
		return nil, &SandboxError{message: "GetMock() is only available in sandbox mode"}
	}
	return MockUser(), nil
}

// mapClaimsToUser maps JWT claims to FaydaUser
func mapClaimsToUser(claims jwt.MapClaims) (*FaydaUser, error) {
	user := &FaydaUser{}

	// Map standard claims
	if sub, ok := claims["sub"].(string); ok {
		user.Sub = sub
	}
	if name, ok := claims["name"].(string); ok {
		user.Name = name
	}
	if nameAm, ok := claims["name#am"].(string); ok {
		user.NameAm = nameAm
	}
	if nameEn, ok := claims["name#en"].(string); ok {
		user.NameEn = nameEn
	}
	if email, ok := claims["email"].(string); ok {
		user.Email = email
	}
	if phone, ok := claims["phone_number"].(string); ok {
		user.PhoneNumber = phone
	}
	if picture, ok := claims["picture"].(string); ok {
		user.Picture = picture
	}
	if gender, ok := claims["gender"].(string); ok {
		user.Gender = gender
	}
	if birthdate, ok := claims["birthdate"].(string); ok {
		user.Birthdate = birthdate
	}

	// Map address
	if addressObj, ok := claims["address"].(map[string]interface{}); ok {
		addr := &FaydaAddress{}
		if formatted, ok := addressObj["formatted"].(string); ok {
			addr.Formatted = formatted
		}
		if locality, ok := addressObj["locality"].(string); ok {
			addr.Locality = locality
		}
		if country, ok := addressObj["country"].(string); ok {
			addr.Country = country
		}
		user.Address = addr
	}

	return user, nil
}
