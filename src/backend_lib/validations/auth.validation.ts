import type { UserRole } from "@/backend_lib/types/auth.types";
import {
  DEPARTMENTS,
  POSITIONS,
  type Department,
  type Position,
} from "@/backend_lib/types/attendance.types";

const ALLOWED_ROLES: UserRole[] = ["ceo", "head", "manager", "hr", "employee"];
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAllowedCompanyEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return lower.endsWith("@dbinvesting") || lower.endsWith("@dbinvesting.com");
}

function parseEmployeeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (!UUID_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

export function parseSignupBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid request payload.");
  }

  const candidate = body as {
    fullName?: unknown;
    email?: unknown;
    password?: unknown;
    role?: unknown;
    employeeId?: unknown;
    department?: unknown;
    position?: unknown;
    reportsToUserId?: unknown;
  };

  if (typeof candidate.fullName !== "string" || candidate.fullName.trim().length < 2) {
    throw new Error("fullName must be at least 2 characters.");
  }

  if (typeof candidate.email !== "string" || !candidate.email.includes("@")) {
    throw new Error("email must be valid.");
  }

  if (!isAllowedCompanyEmail(candidate.email)) {
    throw new Error("Only @dbinvesting email accounts are allowed.");
  }

  if (typeof candidate.password !== "string" || candidate.password.length < 8) {
    throw new Error("password must be at least 8 characters.");
  }

  if (typeof candidate.role !== "string" || !ALLOWED_ROLES.includes(candidate.role as UserRole)) {
    throw new Error("role is invalid.");
  }

  let department: Department | null = null;
  if (candidate.department !== undefined && candidate.department !== null) {
    const normalizedDepartment =
      typeof candidate.department === "string"
        ? candidate.department.trim().toLowerCase()
        : "";

    if (
      typeof candidate.department !== "string" ||
      !DEPARTMENTS.includes(normalizedDepartment as Department)
    ) {
      throw new Error("department is invalid.");
    }

    department = normalizedDepartment as Department;
  }

  let position: Position | null = null;
  if (candidate.position !== undefined && candidate.position !== null) {
    const normalizedPosition =
      typeof candidate.position === "string"
        ? candidate.position.trim().toLowerCase()
        : "";

    if (
      typeof candidate.position !== "string" ||
      !POSITIONS.includes(normalizedPosition as Position)
    ) {
      throw new Error("position is invalid.");
    }

    position = normalizedPosition as Position;
  }

  return {
    fullName: candidate.fullName,
    email: candidate.email,
    password: candidate.password,
    role: candidate.role as UserRole,
    employeeId: parseEmployeeId(candidate.employeeId),
    department,
    position,
    reportsToUserId: parseEmployeeId(candidate.reportsToUserId),
  };
}

export function parseLoginBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid request payload.");
  }

  const candidate = body as { email?: unknown; password?: unknown };

  if (typeof candidate.email !== "string" || !candidate.email.includes("@")) {
    throw new Error("email must be valid.");
  }

  if (!isAllowedCompanyEmail(candidate.email)) {
    throw new Error("Only @dbinvesting email accounts are allowed.");
  }

  if (typeof candidate.password !== "string" || candidate.password.length < 8) {
    throw new Error("password must be at least 8 characters.");
  }

  return {
    email: candidate.email,
    password: candidate.password,
  };
}

export function parseMicrosoftBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid request payload.");
  }

  const candidate = body as {
    supabaseAccessToken?: unknown;
    employeeId?: unknown;
  };

  if (
    typeof candidate.supabaseAccessToken !== "string" ||
    candidate.supabaseAccessToken.trim().length === 0
  ) {
    throw new Error("supabaseAccessToken is required.");
  }

  return {
    supabaseAccessToken: candidate.supabaseAccessToken,
    employeeId: parseEmployeeId(candidate.employeeId),
  };
}

export function ensureCompanyEmail(email: string): string {
  const normalized = email.trim().toLowerCase();

  if (!isAllowedCompanyEmail(normalized)) {
    throw new Error("Only @dbinvesting email accounts are allowed.");
  }

  return normalized;
}
