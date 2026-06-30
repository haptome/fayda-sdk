# @fayda/react

React components for Fayda authentication. Client-side only — private key stays on server.

## Install

```bash
npm install @fayda/react @fayda/sdk
```

## Quick Start

```tsx
import { FaydaProvider, useFayda, FaydaLoginButton } from "@fayda/react";

function App() {
  return (
    <FaydaProvider
      getAuthorizationUrl={async (claims) => {
        const res = await fetch("/api/auth/url", {
          method: "POST",
          body: JSON.stringify({ claims }),
        });
        return res.json();
      }}
      meUrl="/api/auth/me"
      logoutUrl="/api/auth/logout"
    >
      <LoginPage />
    </FaydaProvider>
  );
}

function LoginPage() {
  const { user, login, logout, isLoading } = useFayda();

  if (isLoading) return <div>Loading...</div>;

  if (user) {
    return (
      <div>
        <p>Welcome, {user.name}!</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <FaydaLoginButton />;
}
```

## How It Works

1. **Your backend** handles Fayda auth (FaydaClient)
2. **React frontend** calls your backend to get login URL
3. **User** redirects to Fayda for authentication
4. **Callback** redirects back to your app
5. **Frontend** fetches user data from `/api/auth/me`

The private key never leaves your server.

## Full Documentation

See [FAYDA_SDK_SPEC.md](../../docs/FAYDA_SDK_SPEC.md) for the complete API reference.
