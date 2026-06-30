from typing import Union

import httpx
from jose import jwt

from fayda_sdk.auth import AuthModule
from fayda_sdk.config import FaydaConfig
from fayda_sdk.errors import FaydaSandboxError
from fayda_sdk.models import FaydaUser
from fayda_sdk.token import TokenModule


def _mock_user() -> FaydaUser:
    return FaydaUser(
        sub="mock-fayda-id-000001",
        name="Abebe Bikila",
        name_am="አበበ ቢኪላ",
        name_en="Abebe Bikila",
        email="abebe.bikila@example.com",
        phone_number="+251911000000",
        picture="https://placehold.co/150x150?text=AB",
        gender="male",
        birthdate="1932-08-07",
        address={
            "formatted": "Addis Ababa, Ethiopia",
            "locality": "Addis Ababa",
            "country": "ET",
        },
    )


class UserInfoModule:
    def __init__(
        self,
        config: FaydaConfig,
        http_client: Union[httpx.Client, httpx.AsyncClient],
        auth_module: AuthModule,
        token_module: TokenModule,
    ):
        self.config = config
        self.http_client = http_client
        self.auth_module = auth_module
        self.token_module = token_module

    def get(self, access_token: str) -> FaydaUser:
        if self.config.sandbox:
            return _mock_user()

        response = self.http_client.get(
            self.config.userinfo_endpoint,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if response.status_code != 200:
            raise Exception(f"UserInfo request failed: {response.status_code}")

        jwt_text = response.text
        claims = jwt.get_unverified_claims(jwt_text)
        return FaydaUser.from_claims(claims)

    def get_from_code(self, code: str, state: str, expected_state: str, code_verifier: str) -> FaydaUser:
        self.auth_module.validate_callback(state, expected_state)
        tokens = self.token_module.exchange(code, code_verifier)
        return self.get(tokens.access_token)

    def get_mock(self) -> FaydaUser:
        if not self.config.sandbox:
            raise FaydaSandboxError("get_mock() is only available in sandbox mode")
        return _mock_user()
