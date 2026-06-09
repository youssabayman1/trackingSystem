export type Department = "dev" | "marketing" | "backoffice";

export type Position =
  | "ceo"
  | "head"
  | "head_of_full_stack"
  | "head_of_hr"
  | "head_of_backoffice"
  | "manager"
  | "hr"
  | "full_stack_developer"
  | "front_end_developer"
  | "vibe_coder"
  | "ui_designer"
  | "ux_designer"
  | "video_creator"
  | "graphic_designer"
  | "backoffice_specialist";

export interface Employee {
  id: string;
  fullName: string;
  department: Department;
  position: Position;
  leaveDaysAvailable: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: Department;
  position: Position;
  attendanceDate: string;
  checkInAt: string;
  checkOutAt: string | null;
}

export interface EmployeesResponse {
  employees: Employee[];
}

export interface AttendanceTodayResponse {
  attendance: AttendanceRecord[];
}

export interface DepartmentMemberStatus {
  userId: string;
  fullName: string;
  role: "ceo" | "head" | "manager" | "hr" | "employee";
  department: Department | null;
  position: string | null;
  reportsToName: string | null;
  isCheckedIn: boolean;
  isOnVacation: boolean;
}

export interface DepartmentTeamResponse {
  department: Department | null;
  members: DepartmentMemberStatus[];
}

export interface LeaveTicket {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  leave_type: "vacation" | "sickleave";
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
}
