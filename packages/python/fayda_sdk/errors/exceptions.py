class FaydaError(Exception):
    pass


class FaydaConfigError(FaydaError):
    pass


class FaydaAuthError(FaydaError):
    pass


class FaydaTokenError(FaydaError):
    def __init__(self, message: str, error_code: str | None = None):
        self.error_code = error_code
        super().__init__(message)


class FaydaInvalidAssertionError(FaydaTokenError):
    pass


class FaydaInvalidTransactionError(FaydaTokenError):
    pass


class FaydaInvalidRequestError(FaydaTokenError):
    pass


class FaydaUserInfoError(FaydaError):
    pass


class FaydaSandboxError(FaydaError):
    pass


def map_token_error(error_code: str, description: str) -> FaydaTokenError:
    if error_code == "invalid_assertion":
        return FaydaInvalidAssertionError(description, error_code)
    elif error_code == "invalid_transaction":
        return FaydaInvalidTransactionError(description, error_code)
    elif error_code == "invalid_request":
        return FaydaInvalidRequestError(description, error_code)
    else:
        return FaydaTokenError(description, error_code)
