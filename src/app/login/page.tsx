"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AuthSuccessResponse } from "@/frontend_lib/types/auth";
import { setAccessToken } from "@/frontend_lib/utils/auth-client";
import { fetchJson } from "@/frontend_lib/utils/fetch-json";
import { getSupabaseBrowserClient } from "@/frontend_lib/utils/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMicrosoftLogin() {
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "openid profile email User.Read",
        },
      });

      if (oauthError) {
        throw new Error(oauthError.message);
      }
    } catch (oauthError) {
      setError(
        oauthError instanceof Error
          ? oauthError.message
          : "Microsoft login failed.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetchJson<AuthSuccessResponse>("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      setAccessToken(response.accessToken);
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <main className="auth-card">
        <h1 className="auth-header-title">Welcome Back</h1>
        <p className="auth-header-subtitle">Sign in to the Attendance Tracking Dashboard</p>

        <form onSubmit={handleSubmit} className="auth-form-group">
          <div className="auth-input-wrapper">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="auth-input"
              placeholder="name@dbinvesting.com"
            />
          </div>

          <div className="auth-input-wrapper">
            <label htmlFor="password" className="auth-label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="auth-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && <p style={{ marginTop: "0.75rem", color: "#ef4444", textAlign: "center", fontSize: "0.9rem", background: "rgba(239, 68, 68, 0.1)", padding: "0.5rem", borderRadius: "8px" }}>{error}</p>}

        <div className="auth-divider">or continue with</div>

        <button
          type="button"
          onClick={() => void handleMicrosoftLogin()}
          className="auth-btn-microsoft"
        >
          <svg width="18" height="18" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#7fba00" d="M11 1h9v9h-9z"/><path fill="#00a4ef" d="M1 11h9v9H1z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
          Dbinvesting- FXBO
        </button>

        <p className="auth-footer">
          No account? <Link href="/signup">Create one</Link>
        </p>
      </main>
    </div>
  );
}
