import { NextRequest, NextResponse } from "next/server";

import { refreshAccessToken } from "@/backend_lib/services/auth.service";

const REFRESH_COOKIE = "refreshToken";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "Refresh token is missing." }, { status: 401 });
    }

    const result = await refreshAccessToken(refreshToken);

    const response = NextResponse.json({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });

    response.cookies.set({
      name: REFRESH_COOKIE,
      value: result.tokens.refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 401 });
  }
}
