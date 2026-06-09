export type UserRole = "ceo" | "head" | "manager" | "hr" | "employee";
export type AccessLevel = "employee" | "hr" | "admin";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accessLevel: AccessLevel;
  employeeId: string | null;
}

export interface AuthUserProfile extends AuthUser {
  department: "dev" | "marketing" | "backoffice" | null;
  position: string | null;
  reportsToUserId: string | null;
  reportsToName: string | null;
}

export interface AuthSuccessResponse {
  user: AuthUser;
  accessToken: string;
}

export interface AuthProfileResponse {
  profile: AuthUserProfile;
}
