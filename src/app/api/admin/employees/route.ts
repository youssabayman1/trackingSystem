import { NextResponse } from "next/server";

import {
  createEmployeeTableRow,
  deleteEmployeeTableRow,
  listEmployeesTableRows,
  updateEmployeeTableRow,
} from "@/backend_lib/services/admin.service";
import { verifyAccessToken } from "@/backend_lib/services/jwt.service";
import type { Department, Position } from "@/backend_lib/types/attendance.types";

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
}

export async function GET(request: Request) {
  try {
    await verifyManagementAccess(request);
    const employees = await listEmployeesTableRows();
    return NextResponse.json({ employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await verifyManagementAccess(request);

    const body = (await request.json()) as {
      fullName?: unknown;
      department?: unknown;
      position?: unknown;
      reportsToEmployeeId?: unknown;
    };

    if (typeof body.fullName !== "string" || body.fullName.trim().length < 2) {
      return NextResponse.json({ message: "fullName is required." }, { status: 400 });
    }

    await createEmployeeTableRow({
      fullName: body.fullName,
      department: String(body.department).trim().toLowerCase() as Department,
      position: String(body.position).trim().toLowerCase() as Position,
      reportsToEmployeeId:
        typeof body.reportsToEmployeeId === "string" && body.reportsToEmployeeId.trim().length > 0
          ? body.reportsToEmployeeId
          : null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    await verifyManagementAccess(request);

    const body = (await request.json()) as {
      id?: unknown;
      fullName?: unknown;
      department?: unknown;
      position?: unknown;
      reportsToEmployeeId?: unknown;
    };

    if (typeof body.id !== "string" || body.id.length === 0) {
      return NextResponse.json({ message: "id is required." }, { status: 400 });
    }

    if (typeof body.fullName !== "string" || body.fullName.trim().length < 2) {
      return NextResponse.json({ message: "fullName is required." }, { status: 400 });
    }

    await updateEmployeeTableRow({
      id: body.id,
      fullName: body.fullName,
      department: String(body.department).trim().toLowerCase() as Department,
      position: String(body.position).trim().toLowerCase() as Position,
      reportsToEmployeeId:
        typeof body.reportsToEmployeeId === "string" && body.reportsToEmployeeId.trim().length > 0
          ? body.reportsToEmployeeId
          : null,
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
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "id is required." }, { status: 400 });
    }

    await deleteEmployeeTableRow(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
