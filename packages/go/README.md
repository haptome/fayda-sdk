# fayda-go

Go SDK for Ethiopia's Fayda National Digital ID (eSignet).

## Install

```bash
go get github.com/fayda-sdk/fayda-go
```

## Quick Start

```go
package main

import (
	"context"
	"log"
	"os"

	"github.com/fayda-sdk/fayda-go/fayda"
)

func main() {
	client, err := fayda.NewClient(
		fayda.WithClientID(os.Getenv("FAYDA_CLIENT_ID")),
		fayda.WithPrivateKeyBase64(os.Getenv("FAYDA_PRIVATE_KEY")),
		fayda.WithRedirectURI("https://myapp.com/auth/callback"),
	)
	if err != nil {
		log.Fatal(err)
	}

	// Step 1: Generate authorization URL
	result, err := client.Auth.GetAuthorizationURL(context.Background(), nil)
	if err != nil {
		log.Fatal(err)
	}
	// Store result.State and result.CodeVerifier in session
	// Redirect user to result.URL

	// Step 2: Handle callback
	code := "AUTH_CODE_FROM_CALLBACK"
	callbackState := "STATE_FROM_CALLBACK"
	sessionState := "STORED_STATE"
	sessionVerifier := "STORED_VERIFIER"

	user, err := client.UserInfo.GetFromCode(context.Background(), fayda.GetFromCodeParams{
		Code:          code,
		State:         callbackState,
		ExpectedState: sessionState,
		CodeVerifier:  sessionVerifier,
	})
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("Hello, %s!\n", user.Name)
}
```

## Environment Variables

| Variable | Description |
|---|---|
| `FAYDA_CLIENT_ID` | Your eSignet client ID |
| `FAYDA_PRIVATE_KEY` | Base64-encoded JWK private key |
| `FAYDA_REDIRECT_URI` | OAuth callback URL |
| `FAYDA_SANDBOX` | Set to "true" for sandbox mode (optional) |

## Error Handling

```go
import "github.com/fayda-sdk/fayda-go/fayda"

user, err := client.UserInfo.GetFromCode(ctx, params)
if err != nil {
	switch err.(type) {
	case *fayda.AuthError:
		// State mismatch — CSRF protection triggered
	case *fayda.InvalidTransactionError:
		// Auth flow was interrupted
	case *fayda.InvalidAssertionError:
		// JWT signing failed
	case *fayda.TokenError:
		// Token exchange failed
	}
}
```

## Full Documentation

See [FAYDA_SDK_SPEC.md](../../docs/FAYDA_SDK_SPEC.md) for the complete API reference.
