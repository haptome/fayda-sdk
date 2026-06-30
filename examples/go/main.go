package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/fayda-sdk/fayda-sdk/packages/go/fayda"
)

func main() {
	client, err := fayda.NewClient(
		fayda.WithClientID(os.Getenv("FAYDA_CLIENT_ID")),
		fayda.WithPrivateKeyBase64(os.Getenv("FAYDA_PRIVATE_KEY")),
		fayda.WithRedirectURI("http://localhost:8000/auth/callback"),
	)
	if err != nil {
		log.Fatal(err)
	}

	http.HandleFunc("/", handleIndex)
	http.HandleFunc("/login", handleLogin(client))
	http.HandleFunc("/auth/callback", handleCallback(client))
	http.HandleFunc("/dashboard", handleDashboard)
	http.HandleFunc("/logout", handleLogout)

	fmt.Println("Server listening on http://localhost:8000")
	log.Fatal(http.ListenAndServe(":8000", nil))
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, `
		<h1>Fayda Login Demo</h1>
		<a href="/login">Login with Fayda ID</a>
	`)
}

func handleLogin(client *fayda.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		result, err := client.Auth.GetAuthorizationURL(context.Background(), nil)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error: %v", err), 400)
			return
		}

		// In production, store state + verifier in session
		http.SetCookie(w, &http.Cookie{Name: "fayda_state", Value: result.State})
		http.SetCookie(w, &http.Cookie{Name: "fayda_verifier", Value: result.CodeVerifier})

		http.Redirect(w, r, result.URL, http.StatusSeeOther)
	}
}

func handleCallback(client *fayda.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		state := r.URL.Query().Get("state")

		// In production, retrieve from session
		stateFromCookie, _ := r.Cookie("fayda_state")
		verifierFromCookie, _ := r.Cookie("fayda_verifier")

		user, err := client.UserInfo.GetFromCode(context.Background(), fayda.GetFromCodeParams{
			Code:          code,
			State:         state,
			ExpectedState: stateFromCookie.Value,
			CodeVerifier:  verifierFromCookie.Value,
		})
		if err != nil {
			http.Error(w, fmt.Sprintf("Error: %v", err), 400)
			return
		}

		// In production, store user in session
		userJSON, _ := json.Marshal(user)
		http.SetCookie(w, &http.Cookie{Name: "user", Value: string(userJSON)})

		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
	}
}

func handleDashboard(w http.ResponseWriter, r *http.Request) {
	userCookie, err := r.Cookie("user")
	if err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	var user fayda.FaydaUser
	json.Unmarshal([]byte(userCookie.Value), &user)

	fmt.Fprintf(w, `
		<h1>Dashboard</h1>
		<p>Welcome, %s!</p>
		<p>Email: %s</p>
		<p>Sub (User ID): %s</p>
		<a href="/logout">Logout</a>
	`, user.Name, user.Email, user.Sub)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: "user", MaxAge: -1})
	http.SetCookie(w, &http.Cookie{Name: "fayda_state", MaxAge: -1})
	http.SetCookie(w, &http.Cookie{Name: "fayda_verifier", MaxAge: -1})
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
