import { FaydaConfigError } from "./errors/index.js";

export interface FaydaClientConfig {
  clientId: string;
  privateKeyBase64: string;
  redirectUri: string;
  sandbox?: boolean;
  acrValues?: string;
  scopes?: string[];
  claimsLocales?: string;
}

export interface ResolvedConfig extends Required<FaydaClientConfig> {
  baseUrl: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  discoveryEndpoint: string;
}

export function resolveConfig(input: FaydaClientConfig): ResolvedConfig {
  if (!input.clientId) {
    throw new FaydaConfigError("clientId is required");
  }
  if (!input.privateKeyBase64) {
    throw new FaydaConfigError("privateKeyBase64 is required");
  }
  if (!input.redirectUri) {
    throw new FaydaConfigError("redirectUri is required");
  }

  const baseUrl = "https://esignet.ida.et";
  return {
    ...input,
    clientId: input.clientId,
    privateKeyBase64: input.privateKeyBase64,
    redirectUri: input.redirectUri,
    sandbox: input.sandbox ?? false,
    acrValues: input.acrValues ?? "",
    scopes: input.scopes ?? ["openid", "profile", "email"],
    claimsLocales: input.claimsLocales ?? "en",
    baseUrl,
    authorizationEndpoint: `${baseUrl}/authorize`,
    tokenEndpoint: `${baseUrl}/v1/esignet/oauth/token`,
    userInfoEndpoint: `${baseUrl}/v1/esignet/oidc/userinfo`,
    discoveryEndpoint: `${baseUrl}/v1/esignet/oauth/.well-known/openid-configuration`,
  };
}
