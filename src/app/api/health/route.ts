import { NextResponse } from "next/server";

import { getHealth } from "@/backend_lib/services/health.service";

export async function GET() {
  return NextResponse.json(getHealth());
}
