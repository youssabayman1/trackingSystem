import { NextResponse } from "next/server";

import { login } from "@/backend_lib/services/auth.service";
import { parseLoginBody } from "@/backend_lib/validations/auth.validation";

const REFRESH_COOKIE = "refreshToken";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = parseLoginBody(body);
    const result = await login(payload);

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
    return NextResponse.json({ message }, { status: 400 });
  }
}
