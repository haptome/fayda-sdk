export { FaydaClient } from "./client.js";
export type { FaydaClientConfig, ResolvedConfig } from "./config.js";
export type {
  FaydaTokens,
  FaydaUser,
  FaydaAddress,
  AuthorizationResult,
} from "./models.js";
export {
  FaydaError,
  FaydaConfigError,
  FaydaAuthError,
  FaydaTokenError,
  FaydaInvalidAssertionError,
  FaydaInvalidTransactionError,
  FaydaInvalidRequestError,
  FaydaUserInfoError,
  FaydaSandboxError,
  mapTokenError,
} from "./errors/index.js";

// NestJS re-export (tree-shakeable)
export * from "./nestjs/index.js";

// Express middleware (tree-shakeable — only bundled if imported)
export { faydaLogin, faydaCallback, faydaLogout, faydaLoginRequired } from "./middleware/express.js";
