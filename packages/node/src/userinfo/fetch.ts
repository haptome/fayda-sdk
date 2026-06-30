import { decodeJwt } from "jose";
import { ResolvedConfig } from "../config.js";
import { FaydaUser, fromUserInfoClaims } from "../models.js";
import { FaydaUserInfoError, FaydaSandboxError } from "../errors/index.js";
import { AuthFlow } from "../auth/flow.js";
import { TokenExchange } from "../token/exchange.js";

const MOCK_USER: FaydaUser = {
  sub: "mock-fayda-id-000001",
  name: "Abebe Bikila",
  nameAm: "አበበ ቢኪላ",
  nameEn: "Abebe Bikila",
  email: "abebe.bikila@example.com",
  phoneNumber: "+251911000000",
  picture: "https://placehold.co/150x150?text=AB",
  gender: "male",
  birthdate: "1932-08-07",
  address: {
    formatted: "Addis Ababa, Ethiopia",
    locality: "Addis Ababa",
    country: "ET",
  },
};

export class UserInfoFetcher {
  constructor(
    private config: ResolvedConfig,
    private authFlow: AuthFlow,
    private tokenExchange: TokenExchange
  ) {}

  async get(accessToken: string): Promise<FaydaUser> {
    if (this.config.sandbox) {
      return MOCK_USER;
    }

    const response = await fetch(this.config.userInfoEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new FaydaUserInfoError(
        `UserInfo request failed: ${response.status}`
      );
    }

    const jwtText = await response.text();
    const claims = decodeJwt(jwtText) as Record<string, unknown>;
    return fromUserInfoClaims(claims);
  }

  async getFromCode(params: {
    code: string;
    state: string;
    expectedState: string;
    codeVerifier: string;
  }): Promise<FaydaUser> {
    this.authFlow.validateCallback(params.state, params.expectedState);
    const tokens = await this.tokenExchange.exchange(
      params.code,
      params.codeVerifier
    );
    return this.get(tokens.accessToken);
  }

  getMock(): FaydaUser {
    if (!this.config.sandbox) {
      throw new FaydaSandboxError("getMock() is only available in sandbox mode");
    }
    return MOCK_USER;
  }
}
