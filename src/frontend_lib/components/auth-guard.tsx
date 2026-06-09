"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  getAccessToken,
  setAccessToken,
  refreshAccessTokenClient,
} from "@/frontend_lib/utils/auth-client";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/api/auth"];

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  } catch {
    return true;
  }
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Allow public paths without auth
    if (!pathname) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (isPublic) {
      setReady(true);
      return;
    }

    const token = getAccessToken();

    async function ensureAuth() {
      if (token && !isTokenExpired(token)) {
        setReady(true);
        return;
      }

      try {
        const newToken = await refreshAccessTokenClient();
        setAccessToken(newToken);
        setReady(true);
      } catch (err) {
        // not authenticated, redirect to login
        router.replace("/login");
      }
    }

    void ensureAuth();
  }, [pathname, router]);

  if (!ready) {
    return <div />;
  }

  return <>{children}</>;
}
