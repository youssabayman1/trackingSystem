import type { JWTPayload } from "jose";

export type UserRole = "ceo" | "head" | "manager" | "hr" | "employee";
export type AccessLevel = "employee" | "hr" | "admin";

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accessLevel: AccessLevel;
  employeeId: string | null;
}

export interface AppUserProfile extends AppUser {
  department: "dev" | "marketing" | "backoffice" | null;
  position: string | null;
  reportsToUserId: string | null;
  reportsToName: string | null;
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  accessLevel: AccessLevel;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  type: "refresh";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
