"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AuthSuccessResponse } from "@/frontend_lib/types/auth";
import { setAccessToken } from "@/frontend_lib/utils/auth-client";
import { fetchJson } from "@/frontend_lib/utils/fetch-json";
import { getSupabaseBrowserClient } from "@/frontend_lib/utils/supabase-browser";

function readHashAccessToken(): string | null {
  const hash = window.location.hash;

  if (!hash || hash.length < 2) {
    return null;
  }

  const params = new URLSearchParams(hash.slice(1));
  return params.get("access_token");
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeMicrosoftLogin() {
      try {
        const callbackUrl = new URL(window.location.href);
        const oauthError = callbackUrl.searchParams.get("error");
        const oauthErrorDescription = callbackUrl.searchParams.get(
          "error_description",
        );

        if (oauthError) {
          throw new Error(
            oauthErrorDescription
              ? decodeURIComponent(oauthErrorDescription.replace(/\+/g, " "))
              : `OAuth error: ${oauthError}`,
          );
        }

        const supabase = getSupabaseBrowserClient();
        const authCode = callbackUrl.searchParams.get("code");

        if (authCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            authCode,
          );

          if (exchangeError) {
            throw new Error(exchangeError.message);
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        const supabaseAccessToken = session?.access_token ?? readHashAccessToken();

        if (sessionError || !supabaseAccessToken) {
          throw new Error("Microsoft session is not available.");
        }

        const payload = await fetchJson<AuthSuccessResponse>("/api/auth/microsoft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ supabaseAccessToken }),
        });

        setAccessToken(payload.accessToken);
        await supabase.auth.signOut();
        router.replace("/");
      } catch (callbackError) {
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "Microsoft authentication failed.",
        );
      }
    }

    void completeMicrosoftLogin();
  }, [router]);

  return (
    <main style={{ maxWidth: "520px", margin: "3rem auto", padding: "1rem" }}>
      <h1>Completing Microsoft Login</h1>
      {!error && <p style={{ marginTop: "0.75rem" }}>Please wait...</p>}
      {error && <p style={{ marginTop: "0.75rem", color: "#b42318" }}>{error}</p>}
    </main>
  );
}
