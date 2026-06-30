import base64
import hashlib
import json
import secrets
import urllib.parse
from typing import Optional, Any

from fayda_sdk.config import FaydaConfig
from fayda_sdk.errors import FaydaAuthError
from fayda_sdk.models import AuthorizationResult


class AuthModule:
    def __init__(self, config: FaydaConfig):
        self.config = config

    def get_authorization_url(self, claims: Optional[dict[str, Any]] = None) -> AuthorizationResult:
        # Generate PKCE code_verifier: 64 random bytes -> base64url, no padding
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).rstrip(b"=").decode()

        # Generate code_challenge: SHA256(code_verifier) -> base64url, no padding
        challenge_bytes = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(challenge_bytes).rstrip(b"=").decode()

        # Generate state: random 32 bytes -> base64url, no padding
        state = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()

        # Build query parameters
        params: dict[str, str] = {
            "response_type": "code",
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "scope": " ".join(self.config.scopes),
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "state": state,
        }

        if self.config.acr_values:
            params["acr_values"] = self.config.acr_values

        if self.config.claims_locales:
            params["claims_locales"] = self.config.claims_locales

        if claims:
            params["claims"] = urllib.parse.quote(json.dumps(claims, separators=(",", ":")))

        url = f"{self.config.authorization_endpoint}?{urllib.parse.urlencode(params)}"

        return AuthorizationResult(url=url, state=state, code_verifier=code_verifier)

    def validate_callback(self, callback_state: str, expected_state: str) -> None:
        if not secrets.compare_digest(callback_state, expected_state):
            raise FaydaAuthError("State mismatch — possible CSRF attack")
