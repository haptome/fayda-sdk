import React, { createContext, useState, ReactNode } from "react";
import type { FaydaUser } from "@fayda/sdk";

export type LoginMode = "redirect" | "popup";

export interface FaydaContextValue {
  user: FaydaUser | null;
  /** Start login. Pass `{ mode: "popup" }` for in-page popup; default is full redirect. */
  login: (claims?: Record<string, unknown>, opts?: { mode?: LoginMode }) => Promise<void>;
  logout: () => void;
  /**
   * Silently re-authenticate in a hidden iframe.
   * Resolves with the refreshed user if Fayda has an active session.
   * Rejects after 10 s if no active session exists (user must re-login normally).
   * Requires `onCallback` to be wired up on the provider.
   */
  silentRefresh: (claims?: Record<string, unknown>) => Promise<FaydaUser>;
  isLoading: boolean;
  error: Error | null;
}

export const FaydaContext = createContext<FaydaContextValue | null>(null);

export interface FaydaProviderProps {
  /** Called server-side to build the auth URL (keeps private key off the browser). */
  getAuthorizationUrl: (
    claims?: Record<string, unknown>
  ) => Promise<{ url: string; state: string }>;
  /** Called with code+state after redirect/popup completes. Should exchange tokens and return the user. */
  onCallback?: (code: string, state: string) => Promise<FaydaUser>;
  logoutUrl?: string;
  /** Fetch current user on mount (for SSR-set sessions). */
  meUrl?: string;
  /** Default login mode for all `login()` calls (overridable per-call). Default: "redirect". */
  defaultMode?: LoginMode;
  children: ReactNode;
}

export function FaydaProvider({
  getAuthorizationUrl,
  onCallback,
  logoutUrl,
  meUrl,
  defaultMode = "redirect",
  children,
}: FaydaProviderProps) {
  const [user, setUser] = useState<FaydaUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Hydrate user from server session on mount
  React.useEffect(() => {
    if (!meUrl) return;
    setIsLoading(true);
    fetch(meUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setUser(data as FaydaUser); })
      .catch((e) => setError(e as Error))
      .finally(() => setIsLoading(false));
  }, [meUrl]);

  // ── Popup login ──────────────────────────────────────────────────────────

  const loginPopup = (url: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const popup = window.open(
        url,
        "fayda_login",
        "width=520,height=650,left=200,top=100,menubar=no,toolbar=no,resizable=yes"
      );
      if (!popup) {
        reject(new Error("Popup was blocked — please allow popups for this site."));
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const { type, code, state, error: err } = (event.data ?? {}) as Record<string, unknown>;
        if (type !== "fayda:callback" && type !== "fayda:error") return;
        cleanup();
        if (type === "fayda:error") {
          setIsLoading(false);
          reject(new Error((err as string) ?? "Login failed"));
          return;
        }
        if (onCallback) {
          try {
            const u = await onCallback(code as string, state as string);
            setUser(u);
          } catch (e) {
            setError(e as Error);
            setIsLoading(false);
            reject(e);
            return;
          }
        }
        setIsLoading(false);
        resolve();
      };

      const pollClosed = setInterval(() => {
        if (popup.closed) {
          cleanup();
          setIsLoading(false);
          reject(new Error("Login popup was closed before completing."));
        }
      }, 500);

      const cleanup = () => {
        clearInterval(pollClosed);
        window.removeEventListener("message", handleMessage);
        if (!popup.closed) popup.close();
      };

      window.addEventListener("message", handleMessage);
    });

  // ── Main login ───────────────────────────────────────────────────────────

  const login = async (
    claims?: Record<string, unknown>,
    opts?: { mode?: LoginMode }
  ) => {
    const mode = opts?.mode ?? defaultMode;
    setIsLoading(true);
    setError(null);
    try {
      const { url, state } = await getAuthorizationUrl(claims);
      sessionStorage.setItem("fayda_state", state);
      if (mode === "popup") {
        await loginPopup(url);
      } else {
        window.location.href = url;
      }
    } catch (e) {
      setError(e as Error);
      setIsLoading(false);
    }
  };

  // ── Silent re-auth (hidden iframe) ───────────────────────────────────────

  const silentRefresh = async (
    claims?: Record<string, unknown>
  ): Promise<FaydaUser> => {
    if (!onCallback) {
      throw new Error("onCallback is required to use silentRefresh.");
    }
    const { url } = await getAuthorizationUrl(claims);

    return new Promise<FaydaUser>((resolve, reject) => {
      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;border:none;";
      iframe.src = url;
      document.body.appendChild(iframe);

      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("message", handleMessage);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error("Silent refresh timed out — user may not have an active Fayda session.")
        );
      }, 10_000);

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const { type, code, state } = (event.data ?? {}) as Record<string, unknown>;
        if (type !== "fayda:callback") return;
        cleanup();
        onCallback!(code as string, state as string)
          .then((u) => { setUser(u); resolve(u); })
          .catch(reject);
      };

      window.addEventListener("message", handleMessage);
    });
  };

  // ── Logout ───────────────────────────────────────────────────────────────

  const logout = async () => {
    setIsLoading(true);
    try {
      if (logoutUrl) await fetch(logoutUrl);
      sessionStorage.removeItem("fayda_state");
      setUser(null);
      window.location.href = "/";
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: FaydaContextValue = { user, login, logout, silentRefresh, isLoading, error };

  return (
    <FaydaContext.Provider value={value}>{children}</FaydaContext.Provider>
  );
}
