import { createRemoteJWKSet, importJWK, jwtVerify, SignJWT } from "jose";
import { ResolvedConfig } from "../config.js";
import { FaydaTokens, fromTokenResponse } from "../models.js";
import { mapTokenError } from "../errors/index.js";

const MOCK_TOKENS: FaydaTokens = {
  accessToken: "mock-access-token-abc123def456",
  idToken: "mock-id-token-xyz789uvw012",
  tokenType: "Bearer",
  expiresIn: 3600,
};

export class TokenExchange {
  private cachedKey: any = null;
  private cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private config: ResolvedConfig) {}

  private async getPrivateKey() {
    if (this.cachedKey === null) {
      const jwkJson = JSON.parse(
        Buffer.from(this.config.privateKeyBase64, "base64").toString("utf-8")
      );
      this.cachedKey = await importJWK(jwkJson, "RS256");
    }
    return this.cachedKey;
  }

  private async buildClientAssertion(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const privateKey = await this.getPrivateKey();

    return new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(this.config.clientId)
      .setSubject(this.config.clientId)
      .setAudience(this.config.tokenEndpoint)
      .setIssuedAt(now)
      .setExpirationTime(now + 7200)
      .setJti(crypto.randomUUID())
      .sign(privateKey);
  }

  async exchange(code: string, codeVerifier: string): Promise<FaydaTokens> {
    if (this.config.sandbox) {
      return MOCK_TOKENS;
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: await this.buildClientAssertion(),
    });

    const response = await fetch(this.config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as {
        error: string;
        error_description?: string;
      };
      throw mapTokenError(errorData.error, errorData.error_description ?? "");
    }

    return fromTokenResponse((await response.json()) as Record<string, unknown>);
  }

  async verifyIdToken(idToken: string): Promise<Record<string, unknown>> {
    if (!this.cachedJWKS) {
      const discovery = await fetch(this.config.discoveryEndpoint).then(
        (r) => r.json() as Promise<{ jwks_uri: string }>
      );
      this.cachedJWKS = createRemoteJWKSet(new URL(discovery.jwks_uri));
    }
    const { payload } = await jwtVerify(idToken, this.cachedJWKS, {
      issuer: this.config.baseUrl,
      audience: this.config.clientId,
    });
    return payload as Record<string, unknown>;
  }
}
