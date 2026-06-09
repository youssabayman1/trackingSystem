"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AuthSuccessResponse } from "@/frontend_lib/types/auth";
import { setAccessToken } from "@/frontend_lib/utils/auth-client";
import { fetchJson } from "@/frontend_lib/utils/fetch-json";
import { getSupabaseBrowserClient } from "@/frontend_lib/utils/supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMicrosoftSignup() {
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
          : "Microsoft signup failed.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetchJson<AuthSuccessResponse>("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
          employeeId: null,
        }),
      });

      setAccessToken(response.accessToken);
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <main className="auth-card">
        <h1 className="auth-header-title">Create Account</h1>
        <p className="auth-header-subtitle">Join the Attendance Tracking Dashboard</p>

        <form onSubmit={handleSubmit} className="auth-form-group">
          <div className="auth-input-wrapper">
            <label htmlFor="fullName" className="auth-label">Full name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="auth-input"
              placeholder="John Doe"
            />
          </div>

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
              minLength={8}
              required
              className="auth-input"
              placeholder="••••••••"
            />
          </div>

          <div className="auth-input-wrapper">
            <label htmlFor="role" className="auth-label">Role</label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="auth-input"
              style={{ cursor: "pointer" }}
            >
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="head">Head</option>
              <option value="ceo">CEO</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        {error && <p style={{ marginTop: "0.75rem", color: "#ef4444", textAlign: "center", fontSize: "0.9rem", background: "rgba(239, 68, 68, 0.1)", padding: "0.5rem", borderRadius: "8px" }}>{error}</p>}

        <div className="auth-divider">or continue with</div>

        <button
          type="button"
          onClick={() => void handleMicrosoftSignup()}
          className="auth-btn-microsoft"
        >
          <svg width="18" height="18" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#7fba00" d="M11 1h9v9h-9z"/><path fill="#00a4ef" d="M1 11h9v9H1z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
          Dbinvesting- FXBO
        </button>

        <p className="auth-footer">
          Have an account? <Link href="/login">Login</Link>
        </p>
      </main>
    </div>
  );
}
