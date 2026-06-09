import { NextRequest, NextResponse } from "next/server";

import { revokeRefreshToken } from "@/backend_lib/services/auth.service";

const REFRESH_COOKIE = "refreshToken";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: REFRESH_COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}
