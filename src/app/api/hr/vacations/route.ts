import { NextResponse } from "next/server";

import { decideVacationRequest, listVacationRequests } from "@/backend_lib/services/hr.service";
import { verifyAccessToken } from "@/backend_lib/services/jwt.service";

function canHrManage(accessLevel: string | undefined): boolean {
  return accessLevel === "hr" || accessLevel === "admin";
}

async function verifyHrOrAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    throw new Error("Access token is missing.");
  }

  const payload = await verifyAccessToken(token);

  if (!canHrManage(payload.accessLevel)) {
    throw new Error("Only HR/Admin can access this endpoint.");
  }
}

export async function GET(request: Request) {
  try {
    await verifyHrOrAdmin(request);
    const vacations = await listVacationRequests();
    return NextResponse.json({ vacations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    await verifyHrOrAdmin(request);

    const body = (await request.json()) as {
      id?: unknown;
      decision?: unknown;
    };

    if (typeof body.id !== "string" || body.id.length === 0) {
      return NextResponse.json({ message: "id is required." }, { status: 400 });
    }

    if (body.decision !== "approved" && body.decision !== "rejected") {
      return NextResponse.json({ message: "decision must be approved or rejected." }, { status: 400 });
    }

    await decideVacationRequest({
      id: body.id,
      decision: body.decision,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
