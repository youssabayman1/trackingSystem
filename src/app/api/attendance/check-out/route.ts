import { NextResponse } from "next/server";

import { checkOutEmployee } from "@/backend_lib/services/attendance.service";
import { readEmployeeId } from "@/backend_lib/validations/attendance.validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeId = readEmployeeId(body);
    await checkOutEmployee(employeeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
