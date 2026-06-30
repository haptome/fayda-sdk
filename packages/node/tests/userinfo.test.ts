import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UserInfoFetcher } from "../src/userinfo/fetch.js";
import { FaydaSandboxError } from "../src/errors/index.js";
import { resolveConfig } from "../src/config.js";
import { AuthFlow } from "../src/auth/flow.js";
import { TokenExchange } from "../src/token/exchange.js";

const FIXTURE_DIR = resolve(
  new URL(".", import.meta.url).pathname,
  "../../../tests/fixtures"
);
const MOCK_PRIVATE_JWK = JSON.parse(
  readFileSync(resolve(FIXTURE_DIR, "mock_private_jwk.json"), "utf8")
);
const MOCK_PRIVATE_KEY_B64 = Buffer.from(
  JSON.stringify(MOCK_PRIVATE_JWK)
).toString("base64");
const MOCK_JWT = readFileSync(resolve(FIXTURE_DIR, "mock_id_token.jwt"), "utf8").trim();

function makeUserInfo(sandbox = false) {
  const config = resolveConfig({
    clientId: "test-client",
    privateKeyBase64: MOCK_PRIVATE_KEY_B64,
    redirectUri: "http://localhost/callback",
    sandbox,
  });
  const auth = new AuthFlow(config);
  const token = new TokenExchange(config);
  return new UserInfoFetcher(config, auth, token);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sandbox mode", () => {
  it("get() returns mock user without network", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const ui = makeUserInfo(true);
    const user = await ui.get("any-token");

    expect(user.sub).toBe("mock-fayda-id-000001");
    expect(user.name).toBe("Abebe Bikila");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("getMock() returns mock user in sandbox", () => {
    const ui = makeUserInfo(true);
    const user = ui.getMock();
    expect(user.sub).toBe("mock-fayda-id-000001");
  });

  it("getMock() throws FaydaSandboxError outside sandbox", () => {
    const ui = makeUserInfo(false);
    expect(() => ui.getMock()).toThrow(FaydaSandboxError);
  });
});

describe("live userinfo", () => {
  it("decodes JWT response to FaydaUser", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(MOCK_JWT, { status: 200 })
    );

    const ui = makeUserInfo(false);
    const user = await ui.get("mock-access-token");

    expect(user.sub).toBe("mock-fayda-id-000001");
    expect(user.name).toBe("Abebe Bikila");
    expect(user.email).toBe("abebe.bikila@example.com");
  });

  it("maps name#am → nameAm and name#en → nameEn", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(MOCK_JWT, { status: 200 })
    );

    const ui = makeUserInfo(false);
    const user = await ui.get("mock-access-token");

    expect(user.nameAm).toBe("አበበ ቢኪላ");
    expect(user.nameEn).toBe("Abebe Bikila");
  });
});
