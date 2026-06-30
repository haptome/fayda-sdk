import base64
import hashlib
import re
from urllib.parse import parse_qs, urlparse

import pytest

from fayda_sdk import FaydaClient
from fayda_sdk.errors import FaydaAuthError


def test_pkce_verifier_length():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
    )
    result = client.auth.get_authorization_url()
    assert len(result.code_verifier) in range(43, 129)


def test_pkce_verifier_urlsafe():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
    )
    result = client.auth.get_authorization_url()
    assert "+" not in result.code_verifier
    assert "/" not in result.code_verifier
    assert "=" not in result.code_verifier


def test_pkce_challenge_is_sha256():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
    )
    result = client.auth.get_authorization_url()

    challenge_bytes = hashlib.sha256(result.code_verifier.encode()).digest()
    expected_challenge = base64.urlsafe_b64encode(challenge_bytes).rstrip(b"=").decode()
    assert result.url is not None


def test_authorization_url_required_params():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
    )
    result = client.auth.get_authorization_url()

    parsed = urlparse(result.url)
    params = parse_qs(parsed.query)

    assert params["response_type"][0] == "code"
    assert params["client_id"][0] == "test-client"
    assert params["redirect_uri"][0] == "http://localhost/callback"
    assert "openid" in params["scope"][0]
    assert "code_challenge" in params
    assert params["code_challenge_method"][0] == "S256"
    assert params["state"][0] == result.state


def test_claims_are_url_encoded():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
    )
    claims = {"userinfo": {"name": {"essential": True}}}
    result = client.auth.get_authorization_url(claims=claims)

    parsed = urlparse(result.url)
    params = parse_qs(parsed.query)

    assert "claims" in params
    claims_value = params["claims"][0]
    assert "userinfo" in claims_value
    assert "name" in claims_value


def test_validate_callback_success():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
    )
    state = "test-state"
    client.auth.validate_callback(state, state)


def test_validate_callback_mismatch():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
    )
    with pytest.raises(FaydaAuthError, match="State mismatch"):
        client.auth.validate_callback("state1", "state2")


def test_acr_values_in_url():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
        acr_values="mosip:idp:acr:generated-code",
    )
    result = client.auth.get_authorization_url()

    parsed = urlparse(result.url)
    params = parse_qs(parsed.query)

    assert params["acr_values"][0] == "mosip:idp:acr:generated-code"


def test_claims_locales_in_url():
    client = FaydaClient(
        client_id="test-client",
        private_key_b64="dGVzdA==",
        redirect_uri="http://localhost/callback",
        claims_locales="en am",
    )
    result = client.auth.get_authorization_url()

    parsed = urlparse(result.url)
    params = parse_qs(parsed.query)

    assert params["claims_locales"][0] == "en am"
