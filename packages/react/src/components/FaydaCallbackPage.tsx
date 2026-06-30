import React from "react";

/**
 * Drop-in page component for your OAuth callback route.
 *
 * Handles both popup mode and silent re-auth (hidden iframe):
 * - In popup: sends code+state to opener via postMessage, then closes itself.
 * - In iframe: sends code+state to parent frame via postMessage.
 * - In main window: does nothing (the server-side callback already ran).
 *
 * Mount this at the same path as your `redirect_uri`, e.g.:
 *
 *   // React Router
 *   <Route path="/auth/callback" element={<FaydaCallbackPage />} />
 *
 * The server-side callback still runs normally for redirect-mode logins.
 * This component only activates when it detects it is inside a popup or iframe.
 */
export function FaydaCallbackPage() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    const isInPopup = window.opener !== null && window.opener !== window;
    const isInIframe = !isInPopup && window.parent !== window;

    if (!isInPopup && !isInIframe) return;

    const target = isInPopup ? window.opener : window.parent;
    const message = error
      ? { type: "fayda:error", error }
      : { type: "fayda:callback", code, state };

    target.postMessage(message, window.location.origin);

    if (isInPopup) {
      window.close();
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#555",
        fontSize: 15,
      }}
    >
      <p>Completing login…</p>
    </div>
  );
}
