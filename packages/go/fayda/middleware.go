package fayda

import (
	"context"
	"net/http"
)

type contextKey string

// FaydaUserKey is the context key under which the authenticated FaydaUser is stored.
const FaydaUserKey contextKey = "fayda_user"

// UserFromContext retrieves the FaydaUser set by a session layer or CallbackHandler.
func UserFromContext(ctx context.Context) (*FaydaUser, bool) {
	u, ok := ctx.Value(FaydaUserKey).(*FaydaUser)
	return u, ok
}

// RequireAuth wraps a handler, redirecting unauthenticated requests to /login.
// The upstream session middleware is responsible for injecting FaydaUserKey into the context.
func RequireAuth(next http.Handler) http.Handler {
	return RequireAuthRedirect(next, "/login")
}

// RequireAuthRedirect is like RequireAuth but lets you specify the login path.
func RequireAuthRedirect(next http.Handler, loginPath string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := UserFromContext(r.Context()); !ok {
			http.Redirect(w, r, loginPath, http.StatusFound)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// SessionStore abstracts any key-value session backend (gorilla/sessions, SCS, etc.).
type SessionStore interface {
	Get(r *http.Request, key string) (string, bool)
	Set(w http.ResponseWriter, r *http.Request, key, value string)
	Delete(w http.ResponseWriter, r *http.Request, key string)
}

// LoginHandler returns an http.HandlerFunc that starts the Fayda authorization redirect.
// It stores state and code_verifier in the provided session store.
func (c *Client) LoginHandler(store SessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		result, err := c.Auth.GetAuthorizationURL(r.Context(), nil)
		if err != nil {
			http.Error(w, "Failed to build auth URL: "+err.Error(), http.StatusInternalServerError)
			return
		}
		store.Set(w, r, "fayda_state", result.State)
		store.Set(w, r, "fayda_verifier", result.CodeVerifier)
		http.Redirect(w, r, result.URL, http.StatusFound)
	}
}

// CallbackHandler returns an http.HandlerFunc that handles the OAuth callback.
// On success it calls onSuccess(w, r, user); on failure it calls onError(w, r, err).
func (c *Client) CallbackHandler(
	store SessionStore,
	onSuccess func(http.ResponseWriter, *http.Request, *FaydaUser),
	onError func(http.ResponseWriter, *http.Request, error),
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		if errCode := q.Get("error"); errCode != "" {
			desc := q.Get("error_description")
			msg := errCode
			if desc != "" {
				msg = errCode + ": " + desc
			}
			onError(w, r, &AuthError{Message: msg})
			return
		}
		state, _ := store.Get(r, "fayda_state")
		verifier, _ := store.Get(r, "fayda_verifier")
		store.Delete(w, r, "fayda_state")
		store.Delete(w, r, "fayda_verifier")

		user, err := c.UserInfo.GetFromCode(r.Context(), GetFromCodeParams{
			Code:          q.Get("code"),
			State:         q.Get("state"),
			ExpectedState: state,
			CodeVerifier:  verifier,
		})
		if err != nil {
			onError(w, r, err)
			return
		}
		onSuccess(w, r, user)
	}
}

// LogoutHandler returns an http.HandlerFunc that clears the session and redirects.
func LogoutHandler(store SessionStore, keys []string, afterLogout string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		for _, k := range keys {
			store.Delete(w, r, k)
		}
		http.Redirect(w, r, afterLogout, http.StatusFound)
	}
}

