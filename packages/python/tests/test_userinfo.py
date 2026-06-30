import json
import base64
import os

import pytest
import respx

from fayda_sdk import FaydaClient
from fayda_sdk.errors import FaydaSandboxError

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Load mock private key
MOCK_PRIVATE_JWK_PATH = os.path.join(_REPO_ROOT, "tests", "fixtures", "mock_private_jwk.json")
with open(MOCK_PRIVATE_JWK_PATH) as f:
    MOCK_PRIVATE_JWK = json.load(f)

MOCK_PRIVATE_KEY_B64 = base64.b64encode(json.dumps(MOCK_PRIVATE_JWK).encode()).decode()

# Load mock JWT
MOCK_ID_TOKEN_PATH = os.path.join(_REPO_ROOT, "tests", "fixtures", "mock_id_token.jwt")
with open(MOCK_ID_TOKEN_PATH) as f:
    MOCK_ID_TOKEN = f.read().strip()


@respx.mock
def test_get_userinfo_decodes_jwt():
    respx.get("https://esignet.ida.et/v1/esignet/oidc/userinfo").mock(
        return_value=__import__("httpx").Response(200, text=MOCK_ID_TOKEN)
    )

    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
    )

    user = client.userinfo.get("mock-access-token")
    assert user.sub == "mock-fayda-id-000001"
    assert user.name == "Abebe Bikila"
    assert user.email == "abebe.bikila@example.com"


@respx.mock
def test_multilingual_name_mapping():
    respx.get("https://esignet.ida.et/v1/esignet/oidc/userinfo").mock(
        return_value=__import__("httpx").Response(200, text=MOCK_ID_TOKEN)
    )

    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
    )

    user = client.userinfo.get("mock-access-token")
    assert user.name_en == "Abebe Bikila"
    assert user.name_am == "አበበ ቢኪላ"


def test_get_mock_in_sandbox():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
        sandbox=True,
    )

    user = client.userinfo.get_mock()
    assert user.sub == "mock-fayda-id-000001"
    assert user.name == "Abebe Bikila"


def test_get_mock_outside_sandbox():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
        sandbox=False,
    )

    with pytest.raises(FaydaSandboxError, match="sandbox mode"):
        client.userinfo.get_mock()


def test_sandbox_userinfo_no_network():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64=MOCK_PRIVATE_KEY_B64,
        redirect_uri="http://localhost/callback",
        sandbox=True,
    )

    user = client.userinfo.get("any-token")
    assert user.sub == "mock-fayda-id-000001"
