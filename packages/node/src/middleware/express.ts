/**
 * Express middleware for fayda-sdk.
 *
 * Usage:
 *   import { faydaLogin, faydaCallback, faydaLoginRequired } from "@fayda/sdk/middleware/express";
 *
 *   app.get("/login", faydaLogin(client));
 *   app.get("/auth/callback", faydaCallback(client, "/dashboard"));
 *
 *   app.get("/dashboard", faydaLoginRequired(), (req, res) => {
 *     res.send(`Hello ${req.session.faydaUser?.name}`);
 *   });
 */

import type { FaydaClient } from "../client.js";

// Minimal typing — works with express-session without importing express directly
interface ExpressReq {
  session: {
    faydaState?: string;
    faydaVerifier?: string;
    faydaUser?: { sub: string; name?: string; nameAm?: string; email?: string; phoneNumber?: string; picture?: string };
    [key: string]: unknown;
  };
  query: Record<string, string | undefined>;
}
interface ExpressRes {
  redirect(url: string): void;
  status(code: number): ExpressRes;
  send(body: string): void;
}
type Next = () => void;

/** Middleware that blocks unauthenticated requests and redirects to loginPath. */
export function faydaLoginRequired(loginPath = "/login") {
  return (req: ExpressReq, res: ExpressRes, next: Next) => {
    if (!req.session?.faydaUser) {
      return res.redirect(loginPath);
    }
    next();
  };
}

/** Route handler that starts the Fayda login redirect. */
export function faydaLogin(client: FaydaClient) {
  return async (req: ExpressReq, res: ExpressRes) => {
    const result = await client.auth.getAuthorizationUrl();
    req.session.faydaState = result.state;
    req.session.faydaVerifier = result.codeVerifier;
    res.redirect(result.url);
  };
}

/** Route handler for the OAuth callback. Stores user in session and redirects. */
export function faydaCallback(client: FaydaClient, successPath = "/") {
  return async (req: ExpressReq, res: ExpressRes) => {
    const { code, state, error } = req.query;
    if (error) {
      return res.status(400).send(`Login failed: ${error}`);
    }
    if (!code || !state) {
      return res.status(400).send("Missing code or state");
    }
    try {
      const user = await client.userinfo.getFromCode({
        code,
        state,
        expectedState: req.session.faydaState ?? "",
        codeVerifier: req.session.faydaVerifier ?? "",
      });
      delete req.session.faydaState;
      delete req.session.faydaVerifier;
      req.session.faydaUser = {
        sub: user.sub,
        name: user.name,
        nameAm: user.nameAm,
        email: user.email,
        phoneNumber: user.phoneNumber,
        picture: user.picture,
      };
      res.redirect(successPath);
    } catch (err) {
      res.status(400).send(`Auth error: ${err}`);
    }
  };
}

/** Route handler that clears the Fayda session and redirects. */
export function faydaLogout(afterLogout = "/") {
  return (req: ExpressReq, res: ExpressRes) => {
    delete req.session.faydaUser;
    res.redirect(afterLogout);
  };
}
