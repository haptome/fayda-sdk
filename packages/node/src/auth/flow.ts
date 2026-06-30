import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { AuthorizationResult } from "../models.js";
import { ResolvedConfig } from "../config.js";
import { FaydaAuthError } from "../errors/index.js";

export class AuthFlow {
  constructor(private config: ResolvedConfig) {}

  async getAuthorizationUrl(options?: {
    claims?: Record<string, unknown>;
  }): Promise<AuthorizationResult> {
    const verifierBytes = randomBytes(64);
    const codeVerifier = verifierBytes.toString("base64url");

    const challengeBytes = createHash("sha256").update(codeVerifier).digest();
    const codeChallenge = challengeBytes.toString("base64url");

    const state = randomBytes(32).toString("base64url");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(" "),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    if (this.config.acrValues) {
      params.set("acr_values", this.config.acrValues);
    }
    if (this.config.claimsLocales) {
      params.set("claims_locales", this.config.claimsLocales);
    }
    if (options?.claims) {
      params.set("claims", encodeURIComponent(JSON.stringify(options.claims)));
    }

    const url = `${this.config.authorizationEndpoint}?${params.toString()}`;

    return { url, state, codeVerifier };
  }

  validateCallback(callbackState: string, expectedState: string): void {
    const a = Buffer.from(callbackState);
    const b = Buffer.from(expectedState);

    if (a.length !== b.length) {
      throw new FaydaAuthError("State mismatch — possible CSRF attack");
    }

    if (!timingSafeEqual(a, b)) {
      throw new FaydaAuthError("State mismatch — possible CSRF attack");
    }
  }
}
