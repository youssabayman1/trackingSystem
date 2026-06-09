"use client";

import React, { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { AuthUserProfile } from "@/frontend_lib/types/auth";
import type { AttendanceRecord } from "@/frontend_lib/types/attendance";
import {
  fetchJsonWithAccessToken,
  getAccessToken,
  clearAccessToken,
} from "@/frontend_lib/utils/auth-client";

export function AttendanceContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleLogout() {
    clearAccessToken();
    router.push("/login");
  }

  useEffect(() => {
    async function load() {
      try {
        const token = getAccessToken();
        if (!token) return router.push("/login");

        const profileData = await fetchJsonWithAccessToken<{ profile: AuthUserProfile }>(
          "/api/auth/me"
        );

        const attendanceData = await fetchJsonWithAccessToken<{ history: AttendanceRecord[] }>(
          `/api/attendance/history?employeeId=${profileData.profile.employeeId}`
        );

        setHistory(attendanceData.history);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setChartReady(true);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  function getHours(record: AttendanceRecord) {
    if (!record.checkInAt || !record.checkOutAt) return 0;
    return (
      (new Date(record.checkOutAt).getTime() -
        new Date(record.checkInAt).getTime()) /
      3600000
    );
  }

  const stats = useMemo(() => {
    const totalHours = history.reduce((s, r) => s + getHours(r), 0);
    const avgHours = history.length ? totalHours / history.length : 0;
    const presentDays = history.filter((x) => x.checkInAt).length;
    const attendanceRate = history.length
      ? (presentDays / history.length) * 100
      : 0;

    const today = history[0];

    return {
      totalHours,
      avgHours,
      presentDays,
      attendanceRate,
      today,
    };
  }, [history]);

  const chartData = history
    .slice()
    .reverse()
    .slice(-14)
    .map((r) => ({
      date: r.attendanceDate.slice(5),
      hours: Number(getHours(r).toFixed(1)),
    }));

  if (loading) {
    return <div style={container}>Loading...</div>;
  }

  return (
    <div style={container}>
      {/* HERO - TODAY */}
      <section style={heroCard} id="today-overview">
        <h2>👋 Today Overview</h2>

        <div style={heroGrid}>
          <div>
            <p style={label}>Check In</p>
            <p style={value}>
              {stats.today?.checkInAt
                ? new Date(stats.today.checkInAt).toLocaleTimeString()
                : "Not checked in"}
            </p>
          </div>

          <div>
            <p style={label}>Check Out</p>
            <p style={value}>
              {stats.today?.checkOutAt
                ? new Date(stats.today.checkOutAt).toLocaleTimeString()
                : "-"}
            </p>
          </div>

          <div>
            <p style={label}>Hours Today</p>
            <p style={value}>
              {stats.today ? getHours(stats.today).toFixed(1) : 0}h
            </p>
          </div>
        </div>
      </section>

      {/* KPI CARDS */}
      <section style={kpiGrid} id="kpi-overview">
        <Kpi title="Attendance %" value={`${stats.attendanceRate.toFixed(0)}%`} />
        <Kpi title="Avg Hours" value={`${stats.avgHours.toFixed(1)}h`} />
        <Kpi title="Total Hours" value={`${stats.totalHours.toFixed(1)}h`} />
        <Kpi title="Present Days" value={`${stats.presentDays}`} />
      </section>

      {/* CHART */}
      <section style={card} id="chart-overview">
        <h3>📊 Last 14 Days</h3>

        <div style={chartWrap}>
          {chartReady ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="hours"
                            stroke="var(--brand-green-700)"
                            strokeWidth={3}
                          />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={chartLoading}>Preparing chart...</div>
          )}
        </div>
      </section>

      {/* INSIGHTS */}
      <section style={card} id="attendance-insights">
        <h3>🧠 Insights</h3>

        <ul style={{ marginTop: 10, lineHeight: 1.8 }}>
          <li>✔ Your attendance is stable this month</li>
          <li>✔ Average working hours are within normal range</li>
          <li>⚠ Check late/early checkout patterns</li>
        </ul>
      </section>

      {/* TABLE */}
      <section style={card} id="attendance-history">
        <h3>📅 Attendance History</h3>

        <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Check In</th>
              <th style={thCell}>Check Out</th>
              <th style={thCell}>Hours</th>
              <th style={thCell}>Status</th>
            </tr>
          </thead>

          <tbody>
            {history.map((r, index) => {
              const hours = getHours(r);
              const rowStyle = index % 2 === 0 ? cell : { ...cell, background: "var(--surface-alt)" };

              return (
                <tr key={r.id}>
                  <td style={rowStyle}>{r.attendanceDate}</td>
                  <td style={rowStyle}>
                    {r.checkInAt
                      ? new Date(r.checkInAt).toLocaleTimeString()
                      : "-"}
                  </td>
                  <td style={rowStyle}>
                    {r.checkOutAt
                      ? new Date(r.checkOutAt).toLocaleTimeString()
                      : "-"}
                  </td>
                  <td style={rowStyle}>{hours.toFixed(1)}h</td>
                  <td style={rowStyle}>
                    <span style={hours >= 8 ? badgeGood : badgeBad}>
                      {hours >= 8 ? "Completed" : "Incomplete"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}

export default function AttendancePage() {
  // Keep header + content for standalone route
  return (
    <div>
      <header style={headerShell}>
        <div style={header}>
          <div>
            <h1 style={pageTitle}>Attendance Dashboard</h1>
            <p style={pageSubtitle}>Track work logs, trends, and daily attendance status.</p>
          </div>

          <nav style={navLinks}>
            <Link href="/#attendance-actions" style={navLink}>Home</Link>
            <Link href="/#hr-dashboard" style={navLink}>Requests</Link>
            <Link href="/#today-attendance" style={navLink}>Today</Link>
            <Link href="/attendance" style={navLinkActive}>History</Link>
            <Link href="/#team-section" style={navLink}>Menu</Link>
          </nav>

          <button onClick={() => { clearAccessToken(); window.location.href = '/login'; }} style={logoutBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>

        <nav style={quickJumpNav} aria-label="Attendance section shortcuts">
          <a href="#today-overview" style={quickJumpLink}>Today Overview</a>
          <a href="#kpi-overview" style={quickJumpLink}>KPIs</a>
          <a href="#chart-overview" style={quickJumpLink}>Chart</a>
          <a href="#attendance-insights" style={quickJumpLink}>Insights</a>
          <a href="#attendance-history" style={quickJumpLink}>History Table</a>
        </nav>
      </header>

      <AttendanceContent />
    </div>
  );
}

/* ================= UI COMPONENT ================= */

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div style={kpiCard}>
      <p style={{ fontSize: 13, opacity: 0.7 }}>{title}</p>
      <h2 style={{ marginTop: 6 }}>{value}</h2>
    </div>
  );
}

/* ================= STYLES ================= */

const container: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "16px 20px 32px",
  fontFamily: "var(--font-manrope), sans-serif",
  background: "var(--background)",
  color: "var(--foreground)",
};

const headerShell: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  backdropFilter: "blur(7px)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "14px 14px 12px",
  marginBottom: 20,
  boxShadow: "0 10px 20px rgba(20, 60, 35, 0.08)",
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
};

const pageTitle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: "var(--brand-green-900)",
};

const pageSubtitle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "color-mix(in srgb, var(--foreground) 60%, transparent)",
};

const navLinks: CSSProperties = {
  display: "flex",
  gap: 8,
  background: "var(--surface-alt)",
  border: "1px solid var(--border)",
  padding: "8px",
  borderRadius: 999,
  flexWrap: "wrap",
};

const navLink: CSSProperties = {
  color: "var(--sidebar-link-fg)",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "14px",
  padding: "6px 10px",
  borderRadius: 999,
};

const navLinkActive: CSSProperties = {
  ...navLink,
  background: "var(--brand-green-100)",
  color: "var(--brand-green-700)",
};

const logoutBtn: CSSProperties = {
  padding: "8px 16px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  background: "var(--surface)",
  color: "var(--brand-green-900)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

const quickJumpNav: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const quickJumpLink: CSSProperties = {
  textDecoration: "none",
  fontSize: 12,
  color: "var(--brand-green-700)",
  border: "1px dashed var(--brand-green-100)",
  background: "var(--surface-alt)",
  borderRadius: 999,
  padding: "5px 10px",
};

const heroCard: CSSProperties = {
  background: "var(--surface)",
  padding: 24,
  borderRadius: 12,
  marginBottom: 20,
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.04)",
};

const heroGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  marginTop: 20,
  gap: 15,
};

const kpiGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 15,
  marginBottom: 20,
};

const kpiCard: CSSProperties = {
  background: "var(--surface-alt)",
  padding: 20,
  borderRadius: 12,
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.06)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const card: CSSProperties = {
  background: "var(--surface)",
  padding: 24,
  borderRadius: 12,
  marginBottom: 20,
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.06)",
};

const chartWrap: CSSProperties = {
  height: 300,
  width: "100%",
  minWidth: 0,
};

const chartLoading: CSSProperties = {
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "var(--foreground)",
  fontWeight: 600,
};

const table: CSSProperties = {
  width: "100%",
  marginTop: 15,
  borderCollapse: "collapse",
  textAlign: "left",
  minWidth: 620,
};

const tableWrap: CSSProperties = {
  width: "100%",
  overflowX: "auto",
};

const cell: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid var(--border)",
};

const thCell: CSSProperties = {
  ...cell,
  fontWeight: 600,
  color: "var(--sidebar-link-fg)",
  background: "var(--surface-alt)",
  borderBottom: "2px solid var(--border)",
};

const badgeGood: CSSProperties = {
  padding: "4px 10px",
  background: "var(--brand-green-100)",
  color: "var(--brand-green-700)",
  borderRadius: 9999,
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
};

const badgeBad: CSSProperties = {
  padding: "4px 10px",
  background: "var(--danger-bg)",
  color: "var(--danger)",
  borderRadius: 9999,
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
};

const label: CSSProperties = { fontSize: 13, color: "color-mix(in srgb, var(--foreground) 60%, transparent)", fontWeight: 500, marginBottom: 4 };
const value: CSSProperties = { fontSize: 18, fontWeight: 700, color: "var(--foreground)" };
const errorBox: CSSProperties = {
  background: "var(--danger-bg)",
  padding: 16,
  borderRadius: 8,
  marginBottom: 20,
  color: "var(--danger)",
  border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
};