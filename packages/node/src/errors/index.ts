export class FaydaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaydaError";
  }
}

export class FaydaConfigError extends FaydaError {
  constructor(message: string) {
    super(message);
    this.name = "FaydaConfigError";
  }
}

export class FaydaAuthError extends FaydaError {
  constructor(message: string) {
    super(message);
    this.name = "FaydaAuthError";
  }
}

export class FaydaTokenError extends FaydaError {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "FaydaTokenError";
  }
}

export class FaydaInvalidAssertionError extends FaydaTokenError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = "FaydaInvalidAssertionError";
  }
}

export class FaydaInvalidTransactionError extends FaydaTokenError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = "FaydaInvalidTransactionError";
  }
}

export class FaydaInvalidRequestError extends FaydaTokenError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = "FaydaInvalidRequestError";
  }
}

export class FaydaUserInfoError extends FaydaError {
  constructor(message: string) {
    super(message);
    this.name = "FaydaUserInfoError";
  }
}

export class FaydaSandboxError extends FaydaError {
  constructor(message: string) {
    super(message);
    this.name = "FaydaSandboxError";
  }
}

export function mapTokenError(code: string, description: string): FaydaTokenError {
  switch (code) {
    case "invalid_assertion":
      return new FaydaInvalidAssertionError(description, code);
    case "invalid_transaction":
      return new FaydaInvalidTransactionError(description, code);
    case "invalid_request":
      return new FaydaInvalidRequestError(description, code);
    default:
      return new FaydaTokenError(description, code);
  }
}
