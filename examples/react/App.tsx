/**
 * React example using @fayda/react
 *
 * Demonstrates all FaydaLoginButton variants:
 *   logoVariant: "full" | "mark" | "wordmark"
 *   theme:       "dark" | "light"
 *
 * Your backend needs:
 *   POST /api/auth/url  → { url: string, state: string }
 *   GET  /api/auth/me   → FaydaUser | null
 *   POST /api/auth/logout
 */

import React from "react";
import {
  FaydaProvider,
  useFayda,
  FaydaLoginButton,
  type FaydaLogoVariant,
  type FaydaButtonTheme,
} from "@fayda/react";

export default function App() {
  return (
    <FaydaProvider
      getAuthorizationUrl={async (claims) => {
        const res = await fetch("/api/auth/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claims }),
        });
        return res.json();
      }}
      meUrl="/api/auth/me"
      logoutUrl="/api/auth/logout"
    >
      <Main />
    </FaydaProvider>
  );
}

function Main() {
  const { user, logout, isLoading, error } = useFayda();

  if (error) return <p style={{ color: "red" }}>Error: {error.message}</p>;
  if (isLoading) return <p>Loading…</p>;

  if (user) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 32 }}>
        <h2>Welcome, {user.name ?? user.nameEn}!</h2>
        {user.nameAm && <p>ስም: {user.nameAm}</p>}
        <p>Email: {user.email}</p>
        <p>Sub: {user.sub}</p>
        <button onClick={logout} style={{ marginTop: 16 }}>Sign out</button>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 480,
        margin: "64px auto",
        padding: "0 24px",
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Fayda Login Button Showcase</h1>
      <p style={{ color: "#555", marginBottom: 40 }}>
        Pick the variant and theme that fits your app's design.
      </p>

      {/* Dark theme row */}
      <Section title="Dark theme (default)">
        <Row>
          <Col label='logoVariant="full"'>
            <FaydaLoginButton logoVariant="full" theme="dark" />
          </Col>
          <Col label='logoVariant="mark"'>
            <FaydaLoginButton logoVariant="mark" theme="dark" />
          </Col>
          <Col label='logoVariant="wordmark"'>
            <FaydaLoginButton logoVariant="wordmark" theme="dark" />
          </Col>
        </Row>
      </Section>

      {/* Light theme row */}
      <Section title="Light theme">
        <Row>
          <Col label='logoVariant="full"'>
            <FaydaLoginButton logoVariant="full" theme="light" />
          </Col>
          <Col label='logoVariant="mark"'>
            <FaydaLoginButton logoVariant="mark" theme="light" />
          </Col>
          <Col label='logoVariant="wordmark"'>
            <FaydaLoginButton logoVariant="wordmark" theme="light" />
          </Col>
        </Row>
      </Section>

      {/* Custom label */}
      <Section title="Custom label">
        <FaydaLoginButton
          logoVariant="full"
          theme="dark"
          label="ፋይዳ አይዲ ያስገቡ"
        />
      </Section>

      {/* Disabled state */}
      <Section title="Disabled state">
        <FaydaLoginButton logoVariant="full" theme="dark" disabled />
      </Section>
    </div>
  );
}

// ── tiny layout helpers ────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ marginBottom: 16, color: "#333" }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {children}
    </div>
  );
}

function Col({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      {children}
      <code
        style={{
          fontSize: 11,
          color: "#888",
          background: "#f5f5f5",
          padding: "2px 6px",
          borderRadius: 3,
        }}
      >
        {label}
      </code>
    </div>
  );
}
