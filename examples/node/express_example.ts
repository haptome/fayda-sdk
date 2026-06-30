/**
 * Express example using @fayda/sdk
 *
 * Run: FAYDA_CLIENT_ID=... FAYDA_PRIVATE_KEY=... npm run dev
 * Then visit http://localhost:3000
 */

import express, { Request, Response } from "express";
import session from "express-session";
import { FaydaClient, FaydaUser } from "@fayda/sdk";

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-key-only",
    resave: false,
    saveUninitialized: true,
  })
);

const client = new FaydaClient({
  clientId: process.env.FAYDA_CLIENT_ID || "",
  privateKeyBase64: process.env.FAYDA_PRIVATE_KEY || "",
  redirectUri: "http://localhost:3000/auth/callback",
});

declare global {
  namespace Express {
    interface Request {
      session: any;
    }
  }
}

app.get("/", (_req: Request, res: Response) => {
  res.send(`
    <h1>Fayda Login Demo</h1>
    <a href="/login">Login with Fayda ID</a>
  `);
});

app.get("/login", async (req: Request, res: Response) => {
  try {
    const { url, state, codeVerifier } =
      await client.auth.getAuthorizationUrl();
    req.session.faydaState = state;
    req.session.faydaVerifier = codeVerifier;
    res.redirect(url);
  } catch (error) {
    res.status(400).send(`Error: ${error}`);
  }
});

app.get("/auth/callback", async (req: Request, res: Response) => {
  try {
    const user = await client.userinfo.getFromCode({
      code: req.query.code as string,
      state: req.query.state as string,
      expectedState: req.session.faydaState,
      codeVerifier: req.session.faydaVerifier,
    });

    req.session.user = {
      name: user.name,
      sub: user.sub,
      email: user.email,
    };

    res.redirect("/dashboard");
  } catch (error) {
    res.status(400).send(`Error: ${error}`);
  }
});

app.get("/dashboard", (req: Request, res: Response) => {
  const user = req.session.user as FaydaUser | undefined;
  if (!user) {
    return res.redirect("/");
  }

  res.send(`
    <h1>Dashboard</h1>
    <p>Welcome, ${user.name || "User"}!</p>
    <p>Email: ${user.email || "N/A"}</p>
    <p>Sub (User ID): ${user.sub}</p>
    <a href="/logout">Logout</a>
  `);
});

app.get("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
