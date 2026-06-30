import base64
import json
import time
import urllib.request
import uuid
from typing import Any, Union

import httpx
from jose import jwk, jwt
from jose.exceptions import JWTError

from fayda_sdk.config import FaydaConfig
from fayda_sdk.errors import FaydaTokenError, map_token_error
from fayda_sdk.models import FaydaTokens


class _JWKSCache:
    _TTL = 3600

    def __init__(self) -> None:
        self._data: dict[str, tuple[dict, float]] = {}

    def get(self, url: str) -> dict:
        entry = self._data.get(url)
        if entry and time.time() < entry[1]:
            return entry[0]
        with urllib.request.urlopen(url) as resp:
            jwks = json.loads(resp.read())
        self._data[url] = (jwks, time.time() + self._TTL)
        return jwks


_jwks_cache = _JWKSCache()


class TokenModule:
    def __init__(self, config: FaydaConfig, http_client: Union[httpx.Client, httpx.AsyncClient]):
        self.config = config
        self.http_client = http_client
        self._cached_key = None

    def _get_private_key(self):
        if self._cached_key is None:
            jwk_json = json.loads(base64.b64decode(self.config.private_key_b64).decode("utf-8"))
            self._cached_key = jwk.construct(jwk_json, algorithm="RS256")
        return self._cached_key

    def _build_client_assertion(self) -> str:
        now = int(time.time())
        payload = {
            "iss": self.config.client_id,
            "sub": self.config.client_id,
            "aud": self.config.token_endpoint,
            "iat": now,
            "exp": now + 7200,
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, self._get_private_key(), algorithm="RS256")

    def exchange(self, code: str, code_verifier: str) -> FaydaTokens:
        if self.config.sandbox:
            return FaydaTokens(
                access_token="mock-access-token-abc123def456",
                id_token="mock-id-token-xyz789uvw012",
                token_type="Bearer",
                expires_in=3600,
            )

        body = {
            "grant_type": "authorization_code",
            "client_id": self.config.client_id,
            "code": code,
            "redirect_uri": self.config.redirect_uri,
            "code_verifier": code_verifier,
            "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": self._build_client_assertion(),
        }

        response = self.http_client.post(
            self.config.token_endpoint,
            content=self._urlencode(body),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code != 200:
            error_data = response.json()
            raise map_token_error(error_data["error"], error_data.get("error_description", ""))

        return FaydaTokens.from_dict(response.json())

    def verify_id_token(self, id_token: str) -> dict[str, Any]:
        """Verify an ID token signature using Fayda's public JWKS. Returns decoded claims."""
        with urllib.request.urlopen(self.config.discovery_endpoint) as resp:
            discovery = json.loads(resp.read())
        jwks_uri = discovery["jwks_uri"]
        jwks = _jwks_cache.get(jwks_uri)
        try:
            return jwt.decode(
                id_token,
                jwks,
                algorithms=["RS256"],
                audience=self.config.client_id,
            )
        except JWTError as e:
            raise FaydaTokenError(f"ID token verification failed: {e}")

    @staticmethod
    def _urlencode(data: dict) -> str:
        return "&".join(f"{k}={__import__('urllib.parse').parse.quote(str(v))}" for k, v in data.items())
