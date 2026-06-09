import { SignJWT, jwtVerify } from "jose";

import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "@/backend_lib/types/auth.types";
import { getAuthEnv } from "@/backend_lib/utils/auth-env";

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

function getSecrets() {
  const env = getAuthEnv();

  return {
    access: new TextEncoder().encode(env.accessSecret),
    refresh: new TextEncoder().encode(env.refreshSecret),
  };
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const { access } = getSecrets();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(access);
}

export async function signRefreshToken(
  payload: RefreshTokenPayload,
): Promise<string> {
  const { refresh } = getSecrets();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES)
    .sign(refresh);
}

export async function verifyAccessToken(token: string) {
  const { access } = getSecrets();
  const result = await jwtVerify<AccessTokenPayload>(token, access);
  return result.payload;
}

export async function verifyRefreshToken(token: string) {
  const { refresh } = getSecrets();
  const result = await jwtVerify<RefreshTokenPayload>(token, refresh);
  return result.payload;
}
