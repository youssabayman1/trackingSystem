import { NextResponse } from "next/server";

import { getEmployees } from "@/backend_lib/services/employees.service";

export async function GET() {
  try {
    const employees = await getEmployees();
    return NextResponse.json({ employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
