import { NextResponse } from "next/server";

import { getTodayAttendance } from "@/backend_lib/services/attendance.service";

export async function GET() {
  try {
    const attendance = await getTodayAttendance();
    return NextResponse.json({ attendance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
