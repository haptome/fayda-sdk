package fayda

import "fmt"

// Error types
type FaydaError struct {
	Message string
	Code    string
}

func (e *FaydaError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("%s (code: %s)", e.Message, e.Code)
	}
	return e.Message
}

type ConfigError struct {
	message string
}

func (e *ConfigError) Error() string {
	return e.message
}

type AuthError struct {
	Message string
}

func (e *AuthError) Error() string {
	return e.Message
}

type TokenError struct {
	Message string
	Code    string
}

func (e *TokenError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("%s (code: %s)", e.Message, e.Code)
	}
	return e.Message
}

type InvalidAssertionError struct {
	TokenError
}

type InvalidTransactionError struct {
	TokenError
}

type InvalidRequestError struct {
	TokenError
}

type UserInfoError struct {
	message string
}

func (e *UserInfoError) Error() string {
	return e.message
}

type SandboxError struct {
	message string
}

func (e *SandboxError) Error() string {
	return e.message
}

// MapTokenError maps Fayda error codes to SDK error types
func MapTokenError(code, description string) error {
	switch code {
	case "invalid_assertion":
		return &InvalidAssertionError{TokenError: TokenError{Message: description, Code: code}}
	case "invalid_transaction":
		return &InvalidTransactionError{TokenError: TokenError{Message: description, Code: code}}
	case "invalid_request":
		return &InvalidRequestError{TokenError: TokenError{Message: description, Code: code}}
	default:
		return &TokenError{Message: description, Code: code}
	}
}
