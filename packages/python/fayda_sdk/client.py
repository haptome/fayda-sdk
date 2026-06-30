from typing import Optional

import httpx

from fayda_sdk.auth import AuthModule
from fayda_sdk.config import FaydaConfig
from fayda_sdk.token import TokenModule
from fayda_sdk.userinfo import UserInfoModule


class FaydaClient:
    def __init__(
        self,
        client_id: str,
        private_key_b64: str,
        redirect_uri: str,
        sandbox: bool = False,
        acr_values: Optional[str] = None,
        scopes: Optional[list[str]] = None,
        claims_locales: str = "en",
    ):
        self.config = FaydaConfig(
            client_id=client_id,
            private_key_b64=private_key_b64,
            redirect_uri=redirect_uri,
            sandbox=sandbox,
            acr_values=acr_values,
            scopes=scopes or ["openid", "profile", "email"],
            claims_locales=claims_locales,
        )
        self._http = httpx.Client()
        self.auth = AuthModule(self.config)
        self.token = TokenModule(self.config, self._http)
        self.userinfo = UserInfoModule(self.config, self._http, self.auth, self.token)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self._http.close()


class AsyncFaydaClient:
    def __init__(
        self,
        client_id: str,
        private_key_b64: str,
        redirect_uri: str,
        sandbox: bool = False,
        acr_values: Optional[str] = None,
        scopes: Optional[list[str]] = None,
        claims_locales: str = "en",
    ):
        self.config = FaydaConfig(
            client_id=client_id,
            private_key_b64=private_key_b64,
            redirect_uri=redirect_uri,
            sandbox=sandbox,
            acr_values=acr_values,
            scopes=scopes or ["openid", "profile", "email"],
            claims_locales=claims_locales,
        )
        self._http = httpx.AsyncClient()
        self.auth = AuthModule(self.config)
        self.token = TokenModule(self.config, self._http)
        self.userinfo = UserInfoModule(self.config, self._http, self.auth, self.token)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self._http.aclose()
