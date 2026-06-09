import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/backend_lib/infrastructure/supabase.server";
import { getUserProfile } from "@/backend_lib/services/auth.service";
import { verifyAccessToken } from "@/backend_lib/services/jwt.service";

async function resolveEmployeeId(token: string): Promise<string | null> {
  const payload = await verifyAccessToken(token);

  if (!payload.sub) {
    return null;
  }

  const profile = await getUserProfile(payload.sub);
  return profile.employeeId;
}

function isMissingLeaveTypeColumn(message: string): boolean {
  return message.toLowerCase().includes("leave_type") && message.toLowerCase().includes("schema cache");
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ message: "Access token is missing." }, { status: 401 });
    }

    const employeeId = await resolveEmployeeId(token);

    if (!employeeId) {
      return NextResponse.json({ message: "Not linked to an employee profile." }, { status: 403 });
    }

    const body = await request.json();
    const { startDate, endDate, leaveType, notes } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ message: "Start and end dates are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const payloadWithLeaveType = {
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType ?? "vacation",
      status: "pending",
      notes: notes ?? null,
    };

    const { error: insertWithTypeError } = await supabase
      .from("employee_vacations")
      .insert(payloadWithLeaveType);

    if (insertWithTypeError && isMissingLeaveTypeColumn(insertWithTypeError.message)) {
      const { error: fallbackError } = await supabase.from("employee_vacations").insert({
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        status: "pending",
        notes: notes ?? null,
      });

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }
    } else if (insertWithTypeError) {
      throw new Error(insertWithTypeError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
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

    const employeeId = await resolveEmployeeId(token);

    if (!employeeId) {
      return NextResponse.json({ message: "Not linked to an employee profile." }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const { data: tickets, error } = await supabase
      .from("employee_vacations")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
