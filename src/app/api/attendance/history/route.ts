import { NextResponse } from "next/server";

import { getEmployeeAttendanceHistory } from "@/backend_lib/services/attendance.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
    }

    const history = await getEmployeeAttendanceHistory(employeeId);
    return NextResponse.json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
