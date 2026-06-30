from dataclasses import dataclass
from typing import Optional, Any


@dataclass
class FaydaTokens:
    access_token: str
    id_token: str
    token_type: str
    expires_in: int

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FaydaTokens":
        return cls(
            access_token=data["access_token"],
            id_token=data["id_token"],
            token_type=data.get("token_type", "Bearer"),
            expires_in=data["expires_in"],
        )


@dataclass
class FaydaUser:
    sub: str
    name: Optional[str] = None
    name_am: Optional[str] = None
    name_en: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    picture: Optional[str] = None
    gender: Optional[str] = None
    birthdate: Optional[str] = None
    address: Optional[dict[str, str]] = None

    @classmethod
    def from_claims(cls, claims: dict[str, Any]) -> "FaydaUser":
        address_data = claims.get("address")
        address = None
        if address_data:
            address_data_am = claims.get("address#am")
            if address_data_am:
                address = {
                    "formatted": address_data.get("formatted"),
                    "formatted_am": address_data_am.get("formatted"),
                }
            else:
                address = address_data

        return cls(
            sub=claims["sub"],
            name=claims.get("name"),
            name_am=claims.get("name#am"),
            name_en=claims.get("name#en"),
            email=claims.get("email"),
            phone_number=claims.get("phone_number"),
            picture=claims.get("picture"),
            gender=claims.get("gender"),
            birthdate=claims.get("birthdate"),
            address=address,
        )


@dataclass
class AuthorizationResult:
    url: str
    state: str
    code_verifier: str
