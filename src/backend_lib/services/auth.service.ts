import { createHash } from "crypto";

import bcrypt from "bcryptjs";

import { getSupabaseServerClient } from "@/backend_lib/infrastructure/supabase.server";
import type {
  AccessLevel,
  AppUser,
  AppUserProfile,
  AuthTokens,
  UserRole,
} from "@/backend_lib/types/auth.types";
import type { Department, Position } from "@/backend_lib/types/attendance.types";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/backend_lib/services/jwt.service";
import { ensureCompanyEmail } from "@/backend_lib/validations/auth.validation";

interface SignupInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string | null;
  department?: Department | null;
  position?: Position | null;
  reportsToUserId?: string | null;
  accessLevel?: AccessLevel;
}

interface LoginInput {
  email: string;
  password: string;
}

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  access_level: AccessLevel;
  password_hash: string;
  employee_id: string | null;
  department: Department | null;
  position: Position | null;
  reports_to_user_id: string | null;
};

type EmployeeRow = {
  id: string;
  department: Department;
  position: Position;
};

const USER_SELECT =
  "id, full_name, email, role, access_level, password_hash, employee_id, department, position, reports_to_user_id";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toUser(row: UserRow): AppUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    accessLevel: row.access_level,
    employeeId: row.employee_id,
  };
}

function defaultAccessLevelForRole(role: UserRole): AccessLevel {
  if (role === "hr") {
    return "hr";
  }

  if (role === "ceo") {
    return "admin";
  }

  return "employee";
}

function getDefaultPositionForDepartment(department: Department): Position {
  if (department === "marketing") {
    return "ui_designer";
  }

  if (department === "backoffice") {
    return "backoffice_specialist";
  }

  return "full_stack_developer";
}

async function getEmployeeDetails(
  employeeId: string | null | undefined,
): Promise<{ department: Department | null; position: Position | null }> {
  if (!employeeId) {
    return { department: null, position: null };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, department, position")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const employee = (data ?? null) as EmployeeRow | null;

  return {
    department: employee?.department ?? null,
    position: employee?.position ?? null,
  };
}

async function issueTokensForUser(user: AppUser): Promise<AuthTokens> {
  const refreshToken = await signRefreshToken({ sub: user.id, type: "refresh" });
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    accessLevel: user.accessLevel,
  });

  const supabase = getSupabaseServerClient();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("auth_refresh_tokens").insert({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { accessToken, refreshToken };
}

export async function signup(input: SignupInput): Promise<{ user: AppUser; tokens: AuthTokens }> {
  const supabase = getSupabaseServerClient();
  const email = ensureCompanyEmail(input.email);

  const { data: existingUser, error: existingError } = await supabase
    .from("app_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingUser) {
    throw new Error("Email is already registered.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const employeeMeta = await getEmployeeDetails(input.employeeId);

  const { data, error } = await supabase
    .from("app_users")
    .insert({
      full_name: input.fullName.trim(),
      email,
      password_hash: passwordHash,
      role: input.role,
      access_level: input.accessLevel ?? defaultAccessLevelForRole(input.role),
      employee_id: input.employeeId ?? null,
      department: input.department ?? employeeMeta.department,
      position: input.position ?? employeeMeta.position,
      reports_to_user_id: input.reportsToUserId ?? null,
    })
    .select(USER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const user = toUser(data as UserRow);
  const tokens = await issueTokensForUser(user);

  return { user, tokens };
}

export async function login(input: LoginInput): Promise<{ user: AppUser; tokens: AuthTokens }> {
  const supabase = getSupabaseServerClient();
  const email = ensureCompanyEmail(input.email);

  const { data, error } = await supabase
    .from("app_users")
    .select(USER_SELECT)
    .eq("email", email)
    .single();

  if (error || !data) {
    throw new Error("Invalid email or password.");
  }

  const row = data as UserRow;
  const isValidPassword = await bcrypt.compare(input.password, row.password_hash);

  if (!isValidPassword) {
    throw new Error("Invalid email or password.");
  }

  const user = toUser(row);
  const tokens = await issueTokensForUser(user);

  return { user, tokens };
}

export async function refreshAccessToken(refreshToken: string) {
  const payload = await verifyRefreshToken(refreshToken);

  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token type.");
  }

  const supabase = getSupabaseServerClient();
  const refreshHash = hashToken(refreshToken);

  const { data: tokenRow, error: tokenError } = await supabase
    .from("auth_refresh_tokens")
    .select("id, user_id, expires_at, revoked_at")
    .eq("token_hash", refreshHash)
    .maybeSingle();

  if (tokenError) {
    throw new Error(tokenError.message);
  }

  if (!tokenRow || tokenRow.revoked_at) {
    throw new Error("Refresh token is not active.");
  }

  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    throw new Error("Refresh token has expired.");
  }

  const { data: userRow, error: userError } = await supabase
    .from("app_users")
    .select(USER_SELECT)
    .eq("id", tokenRow.user_id)
    .single();

  if (userError || !userRow) {
    throw new Error("User does not exist.");
  }

  const { error: revokeError } = await supabase
    .from("auth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  if (revokeError) {
    throw new Error(revokeError.message);
  }

  const user = toUser(userRow as UserRow);
  const tokens = await issueTokensForUser(user);

  return { user, tokens };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const refreshHash = hashToken(refreshToken);

  const { error } = await supabase
    .from("auth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", refreshHash)
    .is("revoked_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserProfile(userId: string): Promise<AppUserProfile> {
  const supabase = getSupabaseServerClient();

  const { data: userData, error: userError } = await supabase
    .from("app_users")
    .select(USER_SELECT)
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    throw new Error("User does not exist.");
  }

  const user = toUser(userData as UserRow);

  const row = userData as UserRow;
  let effectiveEmployeeId = row.employee_id;

  if (!effectiveEmployeeId && row.department) {
    const { data: matchedEmployee, error: matchedEmployeeError } = await supabase
      .from("employees")
      .select("id, department, position")
      .eq("full_name", row.full_name)
      .eq("department", row.department)
      .maybeSingle();

    if (matchedEmployeeError) {
      throw new Error(matchedEmployeeError.message);
    }

    if (matchedEmployee?.id) {
      effectiveEmployeeId = matchedEmployee.id;
    } else {
      const fallbackPosition = row.position ?? getDefaultPositionForDepartment(row.department);

      const { data: createdEmployee, error: createdEmployeeError } = await supabase
        .from("employees")
        .insert({
          full_name: row.full_name,
          department: row.department,
          position: fallbackPosition,
        })
        .select("id")
        .single();

      if (createdEmployeeError || !createdEmployee) {
        throw new Error(createdEmployeeError?.message ?? "Failed to create employee profile.");
      }

      const { error: leaveError } = await supabase.from("leave_balances").insert({
        employee_id: createdEmployee.id,
        remaining_days: 21,
      });

      if (leaveError) {
        throw new Error(leaveError.message);
      }

      effectiveEmployeeId = createdEmployee.id;
    }

    const { error: linkError } = await supabase
      .from("app_users")
      .update({
        employee_id: effectiveEmployeeId,
        position: row.position ?? null,
      })
      .eq("id", row.id);

    if (linkError) {
      throw new Error(linkError.message);
    }
  }

  const employeeMeta = await getEmployeeDetails(effectiveEmployeeId);

  let reportsToName: string | null = null;

  if (row.reports_to_user_id) {
    const { data: reportsTo, error: reportsToError } = await supabase
      .from("app_users")
      .select("full_name")
      .eq("id", row.reports_to_user_id)
      .maybeSingle();

    if (reportsToError) {
      throw new Error(reportsToError.message);
    }

    reportsToName = (reportsTo?.full_name as string | undefined) ?? null;
  }

  return {
    ...user,
    employeeId: effectiveEmployeeId,
    department: row.department ?? employeeMeta.department,
    position: row.position ?? employeeMeta.position,
    reportsToUserId: row.reports_to_user_id,
    reportsToName,
  };
}

export async function loginWithMicrosoft(params: {
  supabaseAccessToken: string;
  employeeId?: string | null;
}): Promise<{ user: AppUser; tokens: AuthTokens }> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user: oauthUser },
    error: oauthError,
  } = await supabase.auth.getUser(params.supabaseAccessToken);

  if (oauthError || !oauthUser?.email) {
    throw new Error("Microsoft authentication failed.");
  }

  const email = ensureCompanyEmail(oauthUser.email);
  const fullName = oauthUser.user_metadata?.full_name ?? oauthUser.user_metadata?.name ?? email;

  const { data: existing, error: existingError } = await supabase
    .from("app_users")
    .select(USER_SELECT)
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  let userRow: UserRow;

  if (existing) {
    userRow = existing as UserRow;

    if (params.employeeId && !userRow.employee_id) {
      const { data: updated, error: updateError } = await supabase
        .from("app_users")
        .update({ employee_id: params.employeeId })
        .eq("id", userRow.id)
        .select(USER_SELECT)
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      userRow = updated as UserRow;
    }
  } else {
    const passwordHash = await bcrypt.hash(`${oauthUser.id}-${Date.now()}`, 12);
    const employeeMeta = await getEmployeeDetails(params.employeeId);

    const { data: created, error: createError } = await supabase
      .from("app_users")
      .insert({
        full_name: fullName,
        email,
        password_hash: passwordHash,
        role: "employee",
        access_level: "employee",
        employee_id: params.employeeId ?? null,
        department: employeeMeta.department,
        position: employeeMeta.position,
      })
      .select(USER_SELECT)
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    userRow = created as UserRow;
  }

  const user = toUser(userRow);
  const tokens = await issueTokensForUser(user);

  return { user, tokens };
}
