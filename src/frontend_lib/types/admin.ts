import type { Department, Position } from "@/frontend_lib/types/attendance";
import type { AccessLevel, UserRole } from "@/frontend_lib/types/auth";

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

export interface AdminMembersResponse {
  members: ManageMember[];
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

export interface AdminEmployeesTableResponse {
  employees: EmployeeTableRecord[];
}

export interface DepartmentAttendanceSummary {
  department: Department;
  checkedInCount: number;
  checkedOutCount: number;
  latestCheckInAt: string | null;
  latestCheckOutAt: string | null;
}

export interface AdminDepartmentSummaryResponse {
  summary: DepartmentAttendanceSummary[];
}

export interface VacationRequestItem {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string | null;
  position: string | null;
  startDate: string;
  endDate: string;
  status: "approved" | "pending" | "rejected";
  notes: string | null;
}

export interface HrVacationResponse {
  vacations: VacationRequestItem[];
}
