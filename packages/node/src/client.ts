import { FaydaClientConfig, resolveConfig } from "./config.js";
import { AuthFlow } from "./auth/flow.js";
import { TokenExchange } from "./token/exchange.js";
import { UserInfoFetcher } from "./userinfo/fetch.js";

export class FaydaClient {
  private config: ReturnType<typeof resolveConfig>;
  auth: AuthFlow;
  token: TokenExchange;
  userinfo: UserInfoFetcher;

  constructor(config: FaydaClientConfig) {
    this.config = resolveConfig(config);
    this.auth = new AuthFlow(this.config);
    this.token = new TokenExchange(this.config);
    this.userinfo = new UserInfoFetcher(this.config, this.auth, this.token);
  }
}
