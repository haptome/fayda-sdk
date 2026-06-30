import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TokenExchange } from "../src/token/exchange.js";
import {
  FaydaTokenError,
  FaydaInvalidTransactionError,
} from "../src/errors/index.js";
import { resolveConfig } from "../src/config.js";

// Load the test RSA private JWK from shared fixtures
const FIXTURE_PATH = resolve(
  new URL(".", import.meta.url).pathname,
  "../../../tests/fixtures/mock_private_jwk.json"
);
const MOCK_PRIVATE_JWK = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
const MOCK_PRIVATE_KEY_B64 = Buffer.from(
  JSON.stringify(MOCK_PRIVATE_JWK)
).toString("base64");

function makeExchange(sandbox = false) {
  return new TokenExchange(
    resolveConfig({
      clientId: "test-client",
      privateKeyBase64: MOCK_PRIVATE_KEY_B64,
      redirectUri: "http://localhost/callback",
      sandbox,
    })
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sandbox mode", () => {
  it("returns mock tokens without any network call", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const exchange = makeExchange(true);
    const tokens = await exchange.exchange("any-code", "any-verifier");

    expect(tokens.accessToken).toBe("mock-access-token-abc123def456");
    expect(tokens.tokenType).toBe("Bearer");
    expect(tokens.expiresIn).toBe(3600);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("live exchange", () => {
  it("returns FaydaTokens on 200 response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "live-access-token",
          id_token: "live-id-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
        { status: 200 }
      )
    );

    const exchange = makeExchange();
    const tokens = await exchange.exchange("auth-code", "verifier-xyz");

    expect(tokens.accessToken).toBe("live-access-token");
    expect(tokens.idToken).toBe("live-id-token");
  });

  it("throws FaydaInvalidTransactionError on invalid_transaction", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "invalid_transaction",
          error_description: "Transaction expired",
        }),
        { status: 400 }
      )
    );

    const exchange = makeExchange();
    await expect(exchange.exchange("code", "verifier")).rejects.toThrow(
      FaydaInvalidTransactionError
    );
  });

  it("throws FaydaTokenError for unknown error codes", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "invalid_client",
          error_description: "Client not found",
        }),
        { status: 400 }
      )
    );

    const exchange = makeExchange();
    await expect(exchange.exchange("code", "verifier")).rejects.toThrow(
      FaydaTokenError
    );
  });
});
