from dataclasses import dataclass, field
from typing import Optional


class FaydaConfigError(Exception):
    pass


@dataclass
class FaydaConfig:
    client_id: str
    private_key_b64: str
    redirect_uri: str
    sandbox: bool = False
    acr_values: Optional[str] = None
    scopes: list[str] = field(default_factory=lambda: ["openid", "profile", "email"])
    claims_locales: str = "en"
    base_url: str = "https://esignet.ida.et"

    def __post_init__(self):
        if not self.client_id:
            raise FaydaConfigError("client_id is required")
        if not self.private_key_b64:
            raise FaydaConfigError("private_key_b64 is required")
        if not self.redirect_uri:
            raise FaydaConfigError("redirect_uri is required")

    @property
    def authorization_endpoint(self) -> str:
        return f"{self.base_url}/authorize"

    @property
    def token_endpoint(self) -> str:
        return f"{self.base_url}/v1/esignet/oauth/token"

    @property
    def userinfo_endpoint(self) -> str:
        return f"{self.base_url}/v1/esignet/oidc/userinfo"

    @property
    def discovery_endpoint(self) -> str:
        return f"{self.base_url}/v1/esignet/oauth/.well-known/openid-configuration"
