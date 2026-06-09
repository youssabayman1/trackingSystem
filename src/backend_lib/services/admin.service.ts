import { getSupabaseServerClient } from "@/backend_lib/infrastructure/supabase.server";
import bcrypt from "bcryptjs";

import type { AccessLevel, UserRole } from "@/backend_lib/types/auth.types";
import type { Department, Position } from "@/backend_lib/types/attendance.types";
import { ensureCompanyEmail } from "@/backend_lib/validations/auth.validation";

type AdminUserRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  access_level: AccessLevel;
  department: Department | null;
  position: Position | null;
  reports_to_user_id: string | null;
};

type AttendanceSummaryRow = {
  check_in_at: string;
  check_out_at: string | null;
  employees:
    | {
        department: Department;
      }
    | {
        department: Department;
      }[]
    | null;
};

type EmployeeTableRow = {
  id: string;
  full_name: string;
  department: Department;
  position: Position;
  reports_to_employee_id: string | null;
  created_at: string;
};

export interface ManageMember {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  accessLevel: AccessLevel;
  department: Department | null;
  position: Position | null;
  reportsToUserId: string | null;
  reportsToName: string | null;
}

export interface DepartmentAttendanceSummary {
  department: Department;
  checkedInCount: number;
  checkedOutCount: number;
  latestCheckInAt: string | null;
  latestCheckOutAt: string | null;
}

export interface EmployeeTableRecord {
  id: string;
  fullName: string;
  department: Department;
  position: Position;
  reportsToEmployeeId: string | null;
  reportsToEmployeeName: string | null;
  createdAt: string;
}

export async function listManageMembers(filters?: {
  query?: string;
  position?: Position | "";
}): Promise<ManageMember[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("app_users")
    .select("id, full_name, email, role, access_level, department, position, reports_to_user_id")
    .order("full_name", { ascending: true });

  if (filters?.query) {
    query = query.ilike("full_name", `%${filters.query}%`);
  }

  if (filters?.position) {
    query = query.eq("position", filters.position);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AdminUserRow[];
  const byId = new Map(rows.map((row) => [row.id, row.full_name]));

  return rows.map((row) => ({
    userId: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    accessLevel: row.access_level,
    department: row.department,
    position: row.position,
    reportsToUserId: row.reports_to_user_id,
    reportsToName: row.reports_to_user_id ? byId.get(row.reports_to_user_id) ?? null : null,
  }));
}

export async function updateMemberProfile(input: {
  userId: string;
  role: UserRole;
  accessLevel: AccessLevel;
  department: Department | null;
  position: Position | null;
  reportsToUserId: string | null;
}): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("app_users")
    .update({
      role: input.role,
      access_level: input.accessLevel,
      department: input.department,
      position: input.position,
      reports_to_user_id: input.reportsToUserId,
    })
    .eq("id", input.userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createManagedMember(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  accessLevel: AccessLevel;
  department: Department | null;
  position: Position | null;
  reportsToUserId: string | null;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const email = ensureCompanyEmail(input.email);

  const { data: existing, error: existingError } = await supabase
    .from("app_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    throw new Error("Email is already registered.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const { error } = await supabase.from("app_users").insert({
    full_name: input.fullName.trim(),
    email,
    password_hash: passwordHash,
    role: input.role,
    access_level: input.accessLevel,
    department: input.department,
    position: input.position,
    reports_to_user_id: input.reportsToUserId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteManagedMember(userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("app_users").delete().eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getDepartmentAttendanceToday(): Promise<DepartmentAttendanceSummary[]> {
  const supabase = getSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("attendance_records")
    .select("check_in_at, check_out_at, employees(department)")
    .eq("attendance_date", today);

  if (error) {
    throw new Error(error.message);
  }

  const base: DepartmentAttendanceSummary[] = [
    {
      department: "dev",
      checkedInCount: 0,
      checkedOutCount: 0,
      latestCheckInAt: null,
      latestCheckOutAt: null,
    },
    {
      department: "marketing",
      checkedInCount: 0,
      checkedOutCount: 0,
      latestCheckInAt: null,
      latestCheckOutAt: null,
    },
    {
      department: "backoffice",
      checkedInCount: 0,
      checkedOutCount: 0,
      latestCheckInAt: null,
      latestCheckOutAt: null,
    },
  ];

  const byDepartment = new Map(base.map((item) => [item.department, item]));

  for (const row of (data ?? []) as AttendanceSummaryRow[]) {
    const employees = Array.isArray(row.employees) ? row.employees[0] : row.employees;

    if (!employees?.department) {
      continue;
    }

    const department = byDepartment.get(employees.department);

    if (!department) {
      continue;
    }

    department.checkedInCount += 1;

    if (!department.latestCheckInAt || row.check_in_at > department.latestCheckInAt) {
      department.latestCheckInAt = row.check_in_at;
    }

    if (row.check_out_at) {
      department.checkedOutCount += 1;

      if (!department.latestCheckOutAt || row.check_out_at > department.latestCheckOutAt) {
        department.latestCheckOutAt = row.check_out_at;
      }
    }
  }

  return base;
}

export async function listEmployeesTableRows(): Promise<EmployeeTableRecord[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, department, position, reports_to_employee_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as EmployeeTableRow[];
  const nameById = new Map(rows.map((row) => [row.id, row.full_name]));

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    department: row.department,
    position: row.position,
    reportsToEmployeeId: row.reports_to_employee_id,
    reportsToEmployeeName: row.reports_to_employee_id
      ? nameById.get(row.reports_to_employee_id) ?? null
      : null,
    createdAt: row.created_at,
  }));
}

export async function createEmployeeTableRow(input: {
  fullName: string;
  department: Department;
  position: Position;
  reportsToEmployeeId: string | null;
}): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("employees").insert({
    full_name: input.fullName.trim(),
    department: input.department,
    position: input.position,
    reports_to_employee_id: input.reportsToEmployeeId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateEmployeeTableRow(input: {
  id: string;
  fullName: string;
  department: Department;
  position: Position;
  reportsToEmployeeId: string | null;
}): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("employees")
    .update({
      full_name: input.fullName.trim(),
      department: input.department,
      position: input.position,
      reports_to_employee_id: input.reportsToEmployeeId,
    })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteEmployeeTableRow(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("employees").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
