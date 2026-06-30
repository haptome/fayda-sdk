export interface FaydaTokens {
  accessToken: string;
  idToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface FaydaAddress {
  formatted?: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  country?: string;
}

export interface FaydaUser {
  sub: string;
  name?: string;
  nameAm?: string;
  nameEn?: string;
  email?: string;
  phoneNumber?: string;
  picture?: string;
  gender?: string;
  birthdate?: string;
  address?: FaydaAddress;
}

export interface AuthorizationResult {
  url: string;
  state: string;
  codeVerifier: string;
}

export function fromTokenResponse(raw: Record<string, unknown>): FaydaTokens {
  return {
    accessToken: raw.access_token as string,
    idToken: raw.id_token as string,
    tokenType: (raw.token_type as string) || "Bearer",
    expiresIn: raw.expires_in as number,
  };
}

export function fromUserInfoClaims(claims: Record<string, unknown>): FaydaUser {
  const address = claims.address as Record<string, unknown> | undefined;
  const addressAm = claims["address#am"] as Record<string, unknown> | undefined;

  let addressObj: FaydaAddress | undefined;
  if (address) {
    addressObj = {
      formatted: address.formatted as string | undefined,
      streetAddress: address.street_address as string | undefined,
      locality: address.locality as string | undefined,
      region: address.region as string | undefined,
      country: address.country as string | undefined,
    };
    if (addressAm && addressAm.formatted) {
      addressObj.formatted = `${address.formatted} / ${addressAm.formatted}`;
    }
  }

  return {
    sub: claims.sub as string,
    name: (claims.name as string | undefined) || (claims["name#en"] as string | undefined),
    nameEn: (claims["name#en"] as string | undefined),
    nameAm: (claims["name#am"] as string | undefined),
    email: claims.email as string | undefined,
    phoneNumber: claims.phone_number as string | undefined,
    picture: claims.picture as string | undefined,
    gender: claims.gender as string | undefined,
    birthdate: claims.birthdate as string | undefined,
    address: addressObj,
  };
}
