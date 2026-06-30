import json
import base64
import os

import pytest
import respx

from fayda_sdk import FaydaClient
from fayda_sdk.errors import FaydaInvalidTransactionError, FaydaTokenError

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Load mock private key for testing
MOCK_PRIVATE_JWK_PATH = os.path.join(_REPO_ROOT, "tests", "fixtures", "mock_private_jwk.json")
with open(MOCK_PRIVATE_JWK_PATH) as f:
    MOCK_PRIVATE_JWK = json.load(f)

MOCK_PRIVATE_KEY_B64 = base64.b64encode(json.dumps(MOCK_PRIVATE_JWK).encode()).decode()


@respx.mock
def test_token_exchange_success():
    respx.post("https://esignet.ida.et/v1/esignet/oauth/token").mock(
        return_value=__import__("httpx").Response(
            200,
            json={
                "access_token": "mock-access-token",
                "id_token": "mock-id-token",
                "token_type": "Bearer",
                "expires_in": 3600,
            },
        )
    )

    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
    )

    tokens = client.token.exchange("auth-code", "code-verifier-xyz")
    assert tokens.access_token == "mock-access-token"
    assert tokens.id_token == "mock-id-token"
    assert tokens.token_type == "Bearer"
    assert tokens.expires_in == 3600


@respx.mock
def test_token_exchange_invalid_transaction():
    respx.post("https://esignet.ida.et/v1/esignet/oauth/token").mock(
        return_value=__import__("httpx").Response(
            400,
            json={
                "error": "invalid_transaction",
                "error_description": "Transaction expired",
            },
        )
    )

    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
    )

    with pytest.raises(FaydaInvalidTransactionError):
        client.token.exchange("auth-code", "code-verifier-xyz")


@respx.mock
def test_token_exchange_unknown_error():
    respx.post("https://esignet.ida.et/v1/esignet/oauth/token").mock(
        return_value=__import__("httpx").Response(
            400,
            json={
                "error": "invalid_client",
                "error_description": "Client not found",
            },
        )
    )

    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
    )

    with pytest.raises(FaydaTokenError):
        client.token.exchange("auth-code", "code-verifier-xyz")


def test_sandbox_mode_no_network():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
        sandbox=True,
    )

    tokens = client.token.exchange("auth-code", "code-verifier-xyz")
    assert tokens.access_token == "mock-access-token-abc123def456"
    assert tokens.expires_in == 3600
