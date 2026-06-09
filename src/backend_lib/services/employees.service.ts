import { getSupabaseServerClient } from "@/backend_lib/infrastructure/supabase.server";
import type { Employee } from "@/backend_lib/types/attendance.types";

type EmployeeRow = {
  id: string;
  full_name: string;
  department: Employee["department"];
  position: Employee["position"];
};

type LeaveBalanceRow = {
  employee_id: string;
  remaining_days: number;
};

export async function getEmployees(): Promise<Employee[]> {
  const supabase = getSupabaseServerClient();

  const [employeesResult, leaveBalancesResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, department, position")
      .order("full_name", { ascending: true }),
    supabase.from("leave_balances").select("employee_id, remaining_days"),
  ]);

  if (employeesResult.error) {
    throw new Error(employeesResult.error.message);
  }

  if (leaveBalancesResult.error) {
    throw new Error(leaveBalancesResult.error.message);
  }

  const leaveByEmployeeId = new Map(
    ((leaveBalancesResult.data ?? []) as LeaveBalanceRow[]).map((item) => [
      item.employee_id,
      item.remaining_days,
    ]),
  );

  const uniqueEmployees = new Map<string, Employee>();

  for (const employee of (employeesResult.data ?? []) as EmployeeRow[]) {
    const uniqueKey = `${employee.full_name}|${employee.department}|${employee.position}`;

    if (uniqueEmployees.has(uniqueKey)) {
      continue;
    }

    uniqueEmployees.set(uniqueKey, {
      id: employee.id,
      fullName: employee.full_name,
      department: employee.department,
      position: employee.position,
      leaveDaysAvailable: leaveByEmployeeId.get(employee.id) ?? 0,
    });
  }

  return Array.from(uniqueEmployees.values());
}
