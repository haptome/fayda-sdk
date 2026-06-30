import { Inject, Injectable } from "@nestjs/common";
import { FaydaClientConfig } from "../config.js";
import { FaydaClient } from "../client.js";
import { AuthFlow } from "../auth/flow.js";
import { TokenExchange } from "../token/exchange.js";
import { UserInfoFetcher } from "../userinfo/fetch.js";

@Injectable()
export class FaydaService {
  private client: FaydaClient;

  constructor(@Inject("FAYDA_CONFIG") config: FaydaClientConfig) {
    this.client = new FaydaClient(config);
  }

  get auth(): AuthFlow {
    return this.client.auth;
  }

  get token(): TokenExchange {
    return this.client.token;
  }

  get userinfo(): UserInfoFetcher {
    return this.client.userinfo;
  }

  async getAuthorizationUrl(claims?: Record<string, unknown>) {
    return this.client.auth.getAuthorizationUrl({ claims });
  }

  async getUserFromCode(params: {
    code: string;
    state: string;
    expectedState: string;
    codeVerifier: string;
  }) {
    return this.client.userinfo.getFromCode(params);
  }
}
