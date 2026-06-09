import { NextResponse } from "next/server";

import { getMyDepartmentMembers } from "@/backend_lib/services/team.service";
import { verifyAccessToken } from "@/backend_lib/services/jwt.service";

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

    if (!payload.sub) {
      return NextResponse.json({ message: "Access token is invalid." }, { status: 401 });
    }

    const result = await getMyDepartmentMembers(payload.sub);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
