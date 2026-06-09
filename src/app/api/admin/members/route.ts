import { NextResponse } from "next/server";

import {
  createManagedMember,
  deleteManagedMember,
  listManageMembers,
  updateMemberProfile,
} from "@/backend_lib/services/admin.service";
import { verifyAccessToken } from "@/backend_lib/services/jwt.service";
import type { Department, Position } from "@/backend_lib/types/attendance.types";
import type { AccessLevel, UserRole } from "@/backend_lib/types/auth.types";

function isAdminAccess(accessLevel: string | undefined): boolean {
  return accessLevel === "admin";
}

async function verifyManagementAccess(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    throw new Error("Access token is missing.");
  }

  const payload = await verifyAccessToken(token);

  if (!isAdminAccess(payload.accessLevel)) {
    throw new Error("Only admin can access this endpoint.");
  }

  return payload;
}

export async function GET(request: Request) {
  try {
    await verifyManagementAccess(request);

    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const position = (url.searchParams.get("position") ?? "") as Position | "";

    const members = await listManageMembers({ query, position });
    return NextResponse.json({ members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    await verifyManagementAccess(request);

    const body = (await request.json()) as {
      userId?: unknown;
      role?: unknown;
      accessLevel?: unknown;
      department?: unknown;
      position?: unknown;
      reportsToUserId?: unknown;
    };

    if (typeof body.userId !== "string" || body.userId.length === 0) {
      return NextResponse.json({ message: "userId is required." }, { status: 400 });
    }

    const departmentRaw =
      body.department === null || body.department === undefined || body.department === ""
        ? null
        : String(body.department).trim().toLowerCase();

    const positionRaw =
      body.position === null || body.position === undefined || body.position === ""
        ? null
        : String(body.position).trim().toLowerCase();

    const department = departmentRaw as Department | null;
    const position = positionRaw as Position | null;

    const reportsToUserId =
      body.reportsToUserId === null ||
      body.reportsToUserId === undefined ||
      body.reportsToUserId === ""
        ? null
        : (body.reportsToUserId as string);

    const role = (typeof body.role === "string" ? body.role : "employee") as UserRole;
    const accessLevel =
      (typeof body.accessLevel === "string"
        ? body.accessLevel
        : "employee") as AccessLevel;

    await updateMemberProfile({
      userId: body.userId,
      role,
      accessLevel,
      department,
      position,
      reportsToUserId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await verifyManagementAccess(request);

    const body = (await request.json()) as {
      fullName?: unknown;
      email?: unknown;
      password?: unknown;
      role?: unknown;
      accessLevel?: unknown;
      department?: unknown;
      position?: unknown;
      reportsToUserId?: unknown;
    };

    if (typeof body.fullName !== "string" || body.fullName.trim().length < 2) {
      return NextResponse.json({ message: "fullName is required." }, { status: 400 });
    }

    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return NextResponse.json({ message: "email is required." }, { status: 400 });
    }

    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json({ message: "password must be at least 8 characters." }, { status: 400 });
    }

    await createManagedMember({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      role: (typeof body.role === "string" ? body.role : "employee") as UserRole,
      accessLevel:
        (typeof body.accessLevel === "string"
          ? body.accessLevel
          : "employee") as AccessLevel,
      department:
        body.department === null || body.department === undefined || body.department === ""
          ? null
          : (String(body.department).trim().toLowerCase() as Department),
      position:
        body.position === null || body.position === undefined || body.position === ""
          ? null
          : (String(body.position).trim().toLowerCase() as Position),
      reportsToUserId:
        body.reportsToUserId === null ||
        body.reportsToUserId === undefined ||
        body.reportsToUserId === ""
          ? null
          : String(body.reportsToUserId),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyManagementAccess(request);

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "userId is required." }, { status: 400 });
    }

    await deleteManagedMember(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
