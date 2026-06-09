import { getSupabaseServerClient } from "@/backend_lib/infrastructure/supabase.server";
import type { AttendanceRecord } from "@/backend_lib/types/attendance.types";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

type AttendanceRow = {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_at: string;
  check_out_at: string | null;
  employees:
    | {
        full_name: string;
        department: AttendanceRecord["department"];
        position: AttendanceRecord["position"];
      }
    | {
        full_name: string;
        department: AttendanceRecord["department"];
        position: AttendanceRecord["position"];
      }[]
    | null;
};

export async function getTodayAttendance(): Promise<AttendanceRecord[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      "id, employee_id, attendance_date, check_in_at, check_out_at, employees(full_name, department, position)",
    )
    .eq("attendance_date", getTodayDate())
    .order("check_in_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AttendanceRow[]).map((row) => {
    const employee = Array.isArray(row.employees)
      ? row.employees[0]
      : row.employees;

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Unknown",
      department: employee?.department ?? "dev",
      position: employee?.position ?? "full_stack_developer",
      attendanceDate: row.attendance_date,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
    };
  });
}

export async function getEmployeeAttendanceHistory(employeeId: string): Promise<AttendanceRecord[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      "id, employee_id, attendance_date, check_in_at, check_out_at, employees(full_name, department, position)",
    )
    .eq("employee_id", employeeId)
    .order("attendance_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AttendanceRow[]).map((row) => {
    const employee = Array.isArray(row.employees)
      ? row.employees[0]
      : row.employees;

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Unknown",
      department: employee?.department ?? "dev",
      position: employee?.position ?? "full_stack_developer",
      attendanceDate: row.attendance_date,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
    };
  });
}

export async function checkInEmployee(employeeId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("attendance_date", getTodayDate())
    .is("check_out_at", null)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    throw new Error("Employee is already checked in.");
  }

  const { error } = await supabase.from("attendance_records").insert({
    employee_id: employeeId,
    attendance_date: getTodayDate(),
    check_in_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function checkOutEmployee(employeeId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: attendance, error: attendanceError } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("attendance_date", getTodayDate())
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attendanceError) {
    throw new Error(attendanceError.message);
  }

  if (!attendance) {
    throw new Error("No active check-in found for this employee.");
  }

  const { error } = await supabase
    .from("attendance_records")
    .update({ check_out_at: new Date().toISOString() })
    .eq("id", attendance.id);

  if (error) {
    throw new Error(error.message);
  }
}
