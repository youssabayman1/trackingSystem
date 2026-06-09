import { NextResponse } from "next/server";

import { getDepartmentAttendanceToday } from "@/backend_lib/services/admin.service";
import { verifyAccessToken } from "@/backend_lib/services/jwt.service";

function canViewAllAttendance(accessLevel: string | undefined): boolean {
  return accessLevel === "hr" || accessLevel === "admin";
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ message: "Access token is missing." }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);

    if (!canViewAllAttendance(payload.accessLevel)) {
      return NextResponse.json({ message: "Only HR/Admin can access this endpoint." }, { status: 403 });
    }

    const summary = await getDepartmentAttendanceToday();
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
