import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyAccessToken, verifyRefreshToken } from "@/backend_lib/services/jwt.service";
import { applySecurityHeaders } from "@/lib/security/headers";
import { isRateLimited } from "@/lib/security/rate-limit";

const AUTH_FREE_ROUTES = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/health",
];

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function makeJsonResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const routeKey = `${ip}:${pathname}`;

  const authRoute = pathname.startsWith("/api/auth/");
  const limited = authRoute
    ? isRateLimited(routeKey, 10, 60_000)
    : isRateLimited(routeKey, 120, 60_000);

  if (limited) {
    return applySecurityHeaders(
      makeJsonResponse("Too many requests. Please try again later.", 429),
    );
  }

  // Require auth for protected API routes and for main app pages (server-side)
  const isApiProtected =
    pathname.startsWith("/api/attendance") ||
    pathname.startsWith("/api/employees") ||
    pathname.startsWith("/api/team") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/hr");

  const isAppPage =
    pathname === "/" ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/hr");

  if ((isApiProtected || isAppPage) && !AUTH_FREE_ROUTES.includes(pathname)) {
    if (isApiProtected) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;

      if (!token) {
        return applySecurityHeaders(makeJsonResponse("Access token is missing.", 401));
      }

      try {
        await verifyAccessToken(token);
      } catch {
        return applySecurityHeaders(makeJsonResponse("Access token is invalid.", 401));
      }
    } else {
      // For app pages, check refresh cookie and verify it server-side; if invalid, redirect to login
      const refreshToken = request.cookies.get("refreshToken")?.value;

      if (!refreshToken) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }

      try {
        await verifyRefreshToken(refreshToken);
      } catch {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*", "/", "/attendance/:path*", "/team/:path*", "/admin/:path*", "/hr/:path*"],
};
