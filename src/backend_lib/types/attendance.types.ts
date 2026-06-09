export const DEPARTMENTS = ["dev", "marketing", "backoffice"] as const;

export const POSITIONS = [
  "ceo",
  "head",
  "head_of_full_stack",
  "head_of_hr",
  "head_of_backoffice",
  "manager",
  "hr",
  "full_stack_developer",
  "front_end_developer",
  "vibe_coder",
  "ui_designer",
  "ux_designer",
  "video_creator",
  "graphic_designer",
  "backoffice_specialist",
] as const;

export type Department = (typeof DEPARTMENTS)[number];
export type Position = (typeof POSITIONS)[number];

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
