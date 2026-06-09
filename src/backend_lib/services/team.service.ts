import { getSupabaseServerClient } from "@/backend_lib/infrastructure/supabase.server";
import type { UserRole } from "@/backend_lib/types/auth.types";
import type { Department, Position } from "@/backend_lib/types/attendance.types";

type UserRow = {
  id: string;
  full_name: string;
  role: UserRole;
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

type AttendanceActiveRow = {
  employee_id: string;
};

type VacationRow = {
  employee_id: string;
};

export interface DepartmentMemberStatus {
  userId: string;
  fullName: string;
  role: UserRole;
  department: Department | null;
  position: string | null;
  reportsToName: string | null;
  isCheckedIn: boolean;
  isOnVacation: boolean;
}

export async function getMyDepartmentMembers(userId: string): Promise<{
  department: Department | null;
  members: DepartmentMemberStatus[];
}> {
  const supabase = getSupabaseServerClient();

  const { data: meData, error: meError } = await supabase
    .from("app_users")
    .select("id, full_name, role, employee_id, department, position, reports_to_user_id")
    .eq("id", userId)
    .single();

  if (meError || !meData) {
    throw new Error("User does not exist.");
  }

  const me = meData as UserRow;

  let myDepartment = me.department;

  if (!myDepartment && me.employee_id) {
    const { data: meEmployee, error: meEmployeeError } = await supabase
      .from("employees")
      .select("id, department, position")
      .eq("id", me.employee_id)
      .maybeSingle();

    if (meEmployeeError) {
      throw new Error(meEmployeeError.message);
    }

    myDepartment = ((meEmployee ?? null) as EmployeeRow | null)?.department ?? null;
  }

  if (!myDepartment) {
    return { department: null, members: [] };
  }

  const { data: usersData, error: usersError } = await supabase
    .from("app_users")
    .select("id, full_name, role, employee_id, department, position, reports_to_user_id");

  if (usersError) {
    throw new Error(usersError.message);
  }

  const users = (usersData ?? []) as UserRow[];
  const userNameMap = new Map(users.map((user) => [user.id, user.full_name]));

  const { data: departmentEmployeesData, error: departmentEmployeesError } = await supabase
    .from("employees")
    .select("id, full_name, department, position")
    .eq("department", myDepartment)
    .order("full_name", { ascending: true });

  if (departmentEmployeesError) {
    throw new Error(departmentEmployeesError.message);
  }

  const departmentEmployees =
    ((departmentEmployeesData ?? []) as (EmployeeRow & { full_name: string })[]) ?? [];

  const uniqueDepartmentEmployees = new Map<string, EmployeeRow & { full_name: string }>();

  for (const employee of departmentEmployees) {
    const uniqueKey = `${employee.full_name}|${employee.department}|${employee.position}`;

    if (uniqueDepartmentEmployees.has(uniqueKey)) {
      continue;
    }

    uniqueDepartmentEmployees.set(uniqueKey, employee);
  }

  const normalizedDepartmentEmployees = Array.from(uniqueDepartmentEmployees.values());

  const userByEmployeeId = new Map(
    users
      .filter((user) => Boolean(user.employee_id))
      .map((user) => [user.employee_id as string, user]),
  );

  const sameDepartmentEmployeeIds = normalizedDepartmentEmployees.map((employee) => employee.id);

  const today = new Date().toISOString().slice(0, 10);

  let checkedInSet = new Set<string>();

  let vacationSet = new Set<string>();

  if (sameDepartmentEmployeeIds.length > 0) {
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("employee_id")
      .eq("attendance_date", today)
      .is("check_out_at", null)
      .in("employee_id", sameDepartmentEmployeeIds);

    if (attendanceError) {
      throw new Error(attendanceError.message);
    }

    checkedInSet = new Set(
      ((attendanceData ?? []) as AttendanceActiveRow[]).map((item) => item.employee_id),
    );

    const { data: vacationsData, error: vacationsError } = await supabase
      .from("employee_vacations")
      .select("employee_id")
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .in("employee_id", sameDepartmentEmployeeIds);

    if (vacationsError) {
      throw new Error(vacationsError.message);
    }

    vacationSet = new Set(
      ((vacationsData ?? []) as VacationRow[]).map((item) => item.employee_id),
    );
  }

  const members: DepartmentMemberStatus[] = normalizedDepartmentEmployees.map((employee) => {
    const linkedUser = userByEmployeeId.get(employee.id) ?? null;

    return {
      userId: linkedUser?.id ?? `employee:${employee.id}`,
      fullName: linkedUser?.full_name ?? employee.full_name,
      role: linkedUser?.role ?? "employee",
      department: employee.department,
      position: linkedUser?.position ?? employee.position,
      reportsToName:
        linkedUser?.reports_to_user_id
          ? userNameMap.get(linkedUser.reports_to_user_id) ?? null
          : null,
      isCheckedIn: checkedInSet.has(employee.id),
      isOnVacation: vacationSet.has(employee.id),
    };
  });

  const unlinkedDepartmentUsers = users.filter(
    (user) => user.department === myDepartment && !user.employee_id,
  );

  for (const user of unlinkedDepartmentUsers) {
    members.push({
      userId: user.id,
      fullName: user.full_name,
      role: user.role,
      department: user.department,
      position: user.position,
      reportsToName: user.reports_to_user_id
        ? userNameMap.get(user.reports_to_user_id) ?? null
        : null,
      isCheckedIn: false,
      isOnVacation: false,
    });
  }

  return {
    department: myDepartment,
    members: members.sort((a, b) => a.fullName.localeCompare(b.fullName)),
  };
}
