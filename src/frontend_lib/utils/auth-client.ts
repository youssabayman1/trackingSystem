import type { AuthSuccessResponse } from "@/frontend_lib/types/auth";
import { HttpError, fetchJson } from "@/frontend_lib/utils/fetch-json";

const ACCESS_TOKEN_KEY = "accessToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function refreshAccessTokenClient(): Promise<string> {
  const payload = await fetchJson<AuthSuccessResponse>("/api/auth/refresh", {
    method: "POST",
  });

  setAccessToken(payload.accessToken);
  return payload.accessToken;
}

export async function fetchJsonWithAccessToken<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Please login first.");
  }

  try {
    return await fetchJson<T>(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 401) {
      throw error;
    }

    const newToken = await refreshAccessTokenClient();

    return fetchJson<T>(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${newToken}`,
      },
    });
  }
}
