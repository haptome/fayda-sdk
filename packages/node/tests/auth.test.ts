import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { AuthFlow } from "../src/auth/flow.js";
import { FaydaAuthError } from "../src/errors/index.js";
import { resolveConfig } from "../src/config.js";

const BASE_CONFIG = {
  clientId: "test-client",
  privateKeyBase64: "dGVzdA==",
  redirectUri: "http://localhost/callback",
};

function makeFlow(overrides = {}) {
  return new AuthFlow(resolveConfig({ ...BASE_CONFIG, ...overrides }));
}

describe("PKCE code verifier", () => {
  it("is between 43 and 128 characters", async () => {
    const flow = makeFlow();
    const result = await flow.getAuthorizationUrl();
    expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(result.codeVerifier.length).toBeLessThanOrEqual(128);
  });

  it("uses URL-safe base64 (no +, /, or =)", async () => {
    const flow = makeFlow();
    const result = await flow.getAuthorizationUrl();
    expect(result.codeVerifier).not.toContain("+");
    expect(result.codeVerifier).not.toContain("/");
    expect(result.codeVerifier).not.toContain("=");
  });

  it("code_challenge equals SHA-256 of verifier (base64url, no padding)", async () => {
    const flow = makeFlow();
    const result = await flow.getAuthorizationUrl();
    const parsed = new URL(result.url);
    const challenge = parsed.searchParams.get("code_challenge")!;
    const expected = createHash("sha256")
      .update(result.codeVerifier)
      .digest()
      .toString("base64url");
    expect(challenge).toBe(expected);
  });
});

describe("Authorization URL", () => {
  it("contains all required OIDC params", async () => {
    const flow = makeFlow();
    const result = await flow.getAuthorizationUrl();
    const params = new URL(result.url).searchParams;

    expect(params.get("response_type")).toBe("code");
    expect(params.get("client_id")).toBe("test-client");
    expect(params.get("redirect_uri")).toBe("http://localhost/callback");
    expect(params.get("scope")).toContain("openid");
    expect(params.has("code_challenge")).toBe(true);
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("state")).toBe(result.state);
  });

  it("includes acr_values when configured", async () => {
    const flow = makeFlow({ acrValues: "mosip:idp:acr:generated-code" });
    const result = await flow.getAuthorizationUrl();
    const params = new URL(result.url).searchParams;
    expect(params.get("acr_values")).toBe("mosip:idp:acr:generated-code");
  });

  it("URL-encodes claims JSON when provided", async () => {
    const flow = makeFlow();
    const claims = { userinfo: { name: { essential: true } } };
    const result = await flow.getAuthorizationUrl({ claims });
    const params = new URL(result.url).searchParams;
    expect(params.has("claims")).toBe(true);
    const decoded = decodeURIComponent(params.get("claims")!);
    expect(JSON.parse(decoded)).toEqual(claims);
  });
});

describe("validateCallback", () => {
  it("does not throw when states match", () => {
    const flow = makeFlow();
    expect(() => flow.validateCallback("abc123", "abc123")).not.toThrow();
  });

  it("throws FaydaAuthError on state mismatch", () => {
    const flow = makeFlow();
    expect(() => flow.validateCallback("state1", "state2")).toThrow(
      FaydaAuthError
    );
  });

  it("throws FaydaAuthError when lengths differ", () => {
    const flow = makeFlow();
    expect(() => flow.validateCallback("short", "much-longer-state")).toThrow(
      FaydaAuthError
    );
  });
});
