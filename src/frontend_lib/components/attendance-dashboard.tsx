"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import type { AuthProfileResponse, AuthUserProfile } from "@/frontend_lib/types/auth";
import type {
  AdminDepartmentSummaryResponse,
  AdminEmployeesTableResponse,
  AdminMembersResponse,
  EmployeeTableRecord,
  HrVacationResponse,
  ManageMember,
} from "@/frontend_lib/types/admin";
import type {
  AttendanceRecord,
  AttendanceTodayResponse,
  DepartmentTeamResponse,
  Employee,
  EmployeesResponse,
  LeaveTicket,
} from "@/frontend_lib/types/attendance";
import {
  clearAccessToken,
  fetchJsonWithAccessToken,
  getAccessToken,
} from "@/frontend_lib/utils/auth-client";
import { ThemeToggle } from "@/frontend_lib/components/theme-toggle";
import AttendancePage, { AttendanceContent } from "@/app/attendance/page";
import { fetchJson } from "@/frontend_lib/utils/fetch-json";
import { useLocationTracker } from "@/frontend_lib/hooks/use-location-tracker";

const SHIFT_SECONDS = 8 * 60 * 60;
const DEPARTMENTS = ["dev", "marketing", "backoffice"] as const;
const POSITIONS = [
  "ceo",
  "head",
  "head_of_full_stack",
  "head_of_hr",
  "head_of_backoffice",
  "manager",
  "hr",
  "full_stack_developer",
  "front_end_developer",
  "vibe_coder",
  "ui_designer",
  "ux_designer",
  "video_creator",
  "graphic_designer",
  "backoffice_specialist",
] as const;
const ACCESS_LEVELS = ["employee", "hr", "admin"] as const;
const ROLE_OPTIONS = ["employee", "hr", "manager", "head", "ceo"] as const;
const SECTION_IDS = [
  "attendance-actions",
  "admin-dashboard",
  "hr-dashboard",
  "team-section",
  "today-attendance",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

const CARD_STYLE: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "1rem",
  background: "var(--surface)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
};

const MUTED_TEXT_STYLE: CSSProperties = {
  color: "#3f5f4c",
  marginTop: "0.5rem",
};

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function getTimeGreeting(date: Date): string {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function AttendanceDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<AuthUserProfile | null>(null);
  const [teamDepartment, setTeamDepartment] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<DepartmentTeamResponse["members"]>([]);
  const [adminMembers, setAdminMembers] = useState<ManageMember[]>([]);
  const [employeesTableRows, setEmployeesTableRows] = useState<EmployeeTableRecord[]>([]);
  const [adminSummary, setAdminSummary] = useState<AdminDepartmentSummaryResponse["summary"]>([]);
  const [vacations, setVacations] = useState<HrVacationResponse["vacations"]>([]);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminPositionFilter, setAdminPositionFilter] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [newMember, setNewMember] = useState<{
    fullName: string;
    email: string;
    password: string;
    role: typeof ROLE_OPTIONS[number];
    accessLevel: typeof ACCESS_LEVELS[number];
    department: "" | (typeof DEPARTMENTS)[number];
    position: "" | (typeof POSITIONS)[number];
    reportsToUserId: string;
  }>({
    fullName: "",
    email: "",
    password: "",
    role: "employee",
    accessLevel: "employee",
    department: "",
    position: "",
    reportsToUserId: "",
  });
  const [newEmployeeRow, setNewEmployeeRow] = useState<{
    fullName: string;
    department: (typeof DEPARTMENTS)[number];
    position: (typeof POSITIONS)[number];
    reportsToEmployeeId: string;
  }>({
    fullName: "",
    department: "dev",
    position: "full_stack_developer",
    reportsToEmployeeId: "",
  });
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("attendance-actions");
  const [myTickets, setMyTickets] = useState<LeaveTicket[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // start location tracking when authenticated; hook silently no-ops if permission denied
  useLocationTracker(authenticated);

  const loadMyTickets = useCallback(async () => {
    try {
      const data = await fetchJsonWithAccessToken<{ tickets: LeaveTicket[] }>("/api/attendance/leave");
      setMyTickets(data.tickets || []);
    } catch {
      // Ignore errors for unlinked users
    }
  }, []);

  useEffect(() => {
    if (activeSection !== "hr-dashboard" || !authenticated) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void loadMyTickets();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [activeSection, authenticated, loadMyTickets]);

  const isEmployeeRole = profile?.accessLevel === "employee";
  const canEmployeeSubmitAttendance = !isEmployeeRole || Boolean(profile?.employeeId);
  const canManageMembers = profile?.accessLevel === "admin";
  const canHrReview = profile?.accessLevel === "hr" || profile?.accessLevel === "admin";

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const adminVisibleMembers = useMemo(
    () => adminMembers.filter((member) => member.accessLevel !== "employee"),
    [adminMembers],
  );

  const clientMembers = useMemo(
    () => adminMembers.filter((member) => member.accessLevel === "employee"),
    [adminMembers],
  );

  const reportToCandidates = useMemo(
    () =>
      adminMembers.filter(
        (member) =>
          member.role === "head" ||
          member.role === "manager" ||
          member.role === "ceo" ||
          member.position === "head" ||
          member.position === "head_of_full_stack" ||
          member.position === "head_of_hr" ||
          member.position === "head_of_backoffice" ||
          member.position === "manager" ||
          member.position === "ceo" ||
          member.accessLevel === "admin" ||
          member.accessLevel === "hr",
      ),
    [adminMembers],
  );

  const employeeReportToCandidates = useMemo(
    () =>
      employeesTableRows.filter(
        (row) =>
          row.position === "ceo" ||
          row.position === "head" ||
          row.position === "head_of_full_stack" ||
          row.position === "head_of_hr" ||
          row.position === "head_of_backoffice" ||
          row.position === "manager",
      ),
    [employeesTableRows],
  );

  const activeShiftRecord = useMemo(
    () =>
      attendance.find(
        (record) =>
          record.employeeId === selectedEmployeeId &&
          record.checkOutAt === null,
      ) ?? null,
    [attendance, selectedEmployeeId],
  );

  const workedShiftSeconds = useMemo(() => {
    if (!selectedEmployeeId) {
      return 0;
    }

    return attendance
      .filter((record) => record.employeeId === selectedEmployeeId)
      .reduce((totalSeconds, record) => {
        const checkInMs = new Date(record.checkInAt).getTime();
        const endMs = record.checkOutAt
          ? new Date(record.checkOutAt).getTime()
          : clockNow;

        if (Number.isNaN(checkInMs) || Number.isNaN(endMs) || endMs <= checkInMs) {
          return totalSeconds;
        }

        return totalSeconds + Math.floor((endMs - checkInMs) / 1000);
      }, 0);
  }, [attendance, selectedEmployeeId, clockNow]);

  const remainingShiftSeconds = Math.max(0, SHIFT_SECONDS - workedShiftSeconds);
  const remainingShiftPercent = Math.max(
    0,
    Math.min(100, (remainingShiftSeconds / SHIFT_SECONDS) * 100),
  );
  
  const shiftPercent = remainingShiftPercent;
  const workedHours = (workedShiftSeconds / 3600).toFixed(1);
  const remainingHours = (remainingShiftSeconds / 3600).toFixed(1);

  const isCheckedIn = Boolean(activeShiftRecord);
  const greeting = profile ? `${getTimeGreeting(new Date())} ${profile.fullName}` : null;

  async function fetchDashboardData() {
    const [employeesResult, attendanceResult] = await Promise.all([
      fetchJsonWithAccessToken<EmployeesResponse>("/api/employees"),
      fetchJsonWithAccessToken<AttendanceTodayResponse>("/api/attendance/today"),
    ]);

    return {
      employees: employeesResult.employees,
      attendance: attendanceResult.attendance,
    };
  }

  async function loadAdminData(
    query = adminQuery,
    position = adminPositionFilter,
    accessLevel: AuthUserProfile["accessLevel"] | undefined = profile?.accessLevel,
  ) {
    const queryParams = new URLSearchParams();

    if (query.trim()) {
      queryParams.set("q", query.trim());
    }

    if (position.trim()) {
      queryParams.set("position", position.trim());
    }

    if (accessLevel === "admin") {
      const [membersResult, employeesTableResult] = await Promise.all([
        fetchJsonWithAccessToken<AdminMembersResponse>(`/api/admin/members?${queryParams.toString()}`),
        fetchJsonWithAccessToken<AdminEmployeesTableResponse>("/api/admin/employees"),
      ]);

      setAdminMembers(membersResult.members);
      setEmployeesTableRows(employeesTableResult.employees);
    }

    if (accessLevel === "admin" || accessLevel === "hr") {
      const [summaryResult, vacationsResult] = await Promise.all([
        fetchJsonWithAccessToken<AdminDepartmentSummaryResponse>("/api/admin/departments/today"),
        fetchJsonWithAccessToken<HrVacationResponse>("/api/hr/vacations"),
      ]);

      setAdminSummary(summaryResult.summary);
      setVacations(vacationsResult.vacations);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      const token = getAccessToken();

      if (!token) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      try {
        const [profileResult, data] = await Promise.all([
          fetchJsonWithAccessToken<AuthProfileResponse>("/api/auth/me"),
          fetchDashboardData(),
        ]);

        const teamResult = await fetchJsonWithAccessToken<DepartmentTeamResponse>(
          "/api/team/my-department",
        );

        setProfile(profileResult.profile);
        setEmployees(data.employees);
        setAttendance(data.attendance);
        setTeamDepartment(teamResult.department);
        setTeamMembers(teamResult.members);

        if (profileResult.profile.employeeId) {
          setSelectedEmployeeId(profileResult.profile.employeeId);
          return;
        }

        if (profileResult.profile.accessLevel === "employee") {
          setSelectedEmployeeId("");
          setError(
            "Your account is not linked to an employee profile yet. Ask HR/Admin to assign your employee record.",
          );
          return;
        }

        setSelectedEmployeeId((previous) =>
          previous || data.employees[0]?.id || "",
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load data.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, []);

  useEffect(() => {
    const applyHashSection = () => {
      const hash = window.location.hash.replace("#", "") as SectionId;

      if (SECTION_IDS.includes(hash)) {
        setActiveSection(hash);
        return;
      }

      setActiveSection("attendance-actions");
    };

    applyHashSection();
    window.addEventListener("hashchange", applyHashSection);

    return () => {
      window.removeEventListener("hashchange", applyHashSection);
    };
  }, []);

  const loadAdminDataMemo = useMemo(() => loadAdminData, []);

  useEffect(() => {
    if (!authenticated || !profile) {
      return;
    }

    const shouldLoadAdmin = activeSection === "admin-dashboard" && canManageMembers;
    const shouldLoadHr = activeSection === "hr-dashboard" && canHrReview;

    if (!shouldLoadAdmin && !shouldLoadHr) {
      return;
    }

    const abortController = new AbortController();

    async function load() {
        if (!profile) return;
        setAdminLoading(true);
        setError(null);
        try {
            await loadAdminDataMemo(adminQuery, adminPositionFilter, profile.accessLevel);
        } catch(e) {
            setError("Failed to fetch admin data.");
        } finally {
            setAdminLoading(false);
        }
    }
    void load();

    return () => abortController.abort();
  }, [
    activeSection,
    authenticated,
    profile,
    canManageMembers,
    canHrReview,
    adminQuery,
    adminPositionFilter,
    loadAdminDataMemo
  ]);

  useEffect(() => {
    if (!activeShiftRecord) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeShiftRecord]);

  async function submitAttendance(action: "check-in" | "check-out") {
    if (!canEmployeeSubmitAttendance) {
      setError(
        "Your account is not linked to an employee profile yet. Ask HR/Admin to assign your employee record.",
      );
      return;
    }

    if (!selectedEmployeeId) {
      setError("Please select an employee first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await fetchJsonWithAccessToken<{ success: boolean }>(
        `/api/attendance/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeId: selectedEmployeeId }),
        },
      );

      setMessage(
        action === "check-in"
          ? "Employee checked in successfully."
          : "Employee checked out successfully.",
      );

      const data = await fetchDashboardData();
      setEmployees(data.employees);
      setAttendance(data.attendance);

      const teamResult = await fetchJsonWithAccessToken<DepartmentTeamResponse>(
        "/api/team/my-department",
      );
      setTeamDepartment(teamResult.department);
      setTeamMembers(teamResult.members);

      if (
        canHrReview &&
        (activeSection === "admin-dashboard" || activeSection === "hr-dashboard")
      ) {
        await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit attendance action.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await fetchJson<{ success: boolean }>("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      clearAccessToken();
      setAuthenticated(false);
      setProfile(null);
      setTeamDepartment(null);
      setTeamMembers([]);
      setAdminMembers([]);
      setEmployeesTableRows([]);
      setAdminSummary([]);
      setVacations([]);
      setEmployees([]);
      setAttendance([]);
      setSelectedEmployeeId("");
      window.location.href = "/login";
    }
  }

  async function handleAdminSearch() {
    setAdminLoading(true);
    setError(null);

    try {
      await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
    } catch (adminError) {
      setError(adminError instanceof Error ? adminError.message : "Failed to load admin data.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function updateManagedMember(member: ManageMember) {
    setAdminLoading(true);
    setError(null);

    try {
      await fetchJsonWithAccessToken<{ success: boolean }>("/api/admin/members", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: member.userId,
          role: member.role,
          accessLevel: member.accessLevel,
          department: member.department,
          position: member.position,
          reportsToUserId: member.reportsToUserId,
        }),
      });

      await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
      setMessage(`Updated ${member.fullName} successfully.`);
    } catch (adminError) {
      setError(adminError instanceof Error ? adminError.message : "Failed to update member.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function decideVacation(id: string, decision: "approved" | "rejected") {
    setAdminLoading(true);
    setError(null);

    try {
      await fetchJsonWithAccessToken<{ success: boolean }>("/api/hr/vacations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, decision }),
      });

      await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
      setMessage(`Vacation request ${decision}.`);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Failed to update vacation request.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function createMember() {
    setAdminLoading(true);
    setError(null);

    try {
      await fetchJsonWithAccessToken<{ success: boolean }>("/api/admin/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: newMember.fullName,
          email: newMember.email,
          password: newMember.password,
          role: newMember.role,
          accessLevel: newMember.accessLevel,
          department: newMember.department || null,
          position: newMember.position || null,
          reportsToUserId: newMember.reportsToUserId || null,
        }),
      });

      setNewMember({
        fullName: "",
        email: "",
        password: "",
        role: "employee",
        accessLevel: "employee",
        department: "",
        position: "",
        reportsToUserId: "",
      });

      await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
      setMessage("Member created successfully.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create member.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function deleteMember(userId: string) {
    setAdminLoading(true);
    setError(null);

    try {
      await fetchJsonWithAccessToken<{ success: boolean }>(`/api/admin/members?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });

      await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
      setMessage("Member deleted successfully.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete member.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function createEmployeeRow() {
    setAdminLoading(true);
    setError(null);

    try {
      await fetchJsonWithAccessToken<{ success: boolean }>("/api/admin/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: newEmployeeRow.fullName,
          department: newEmployeeRow.department,
          position: newEmployeeRow.position,
          reportsToEmployeeId: newEmployeeRow.reportsToEmployeeId || null,
        }),
      });

      setNewEmployeeRow({
        fullName: "",
        department: "dev",
        position: "full_stack_developer",
        reportsToEmployeeId: "",
      });

      await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
      setMessage("Employee record added successfully.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create employee record.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function updateEmployeeRow(row: EmployeeTableRecord) {
    setAdminLoading(true);
    setError(null);

    try {
      await fetchJsonWithAccessToken<{ success: boolean }>("/api/admin/employees", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: row.id,
          fullName: row.fullName,
          department: row.department,
          position: row.position,
          reportsToEmployeeId: row.reportsToEmployeeId,
        }),
      });

      await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
      setMessage("Employee record updated successfully.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update employee record.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function deleteEmployeeRow(id: string) {
    setAdminLoading(true);
    setError(null);

    try {
      await fetchJsonWithAccessToken<{ success: boolean }>(`/api/admin/employees?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      await loadAdminData(adminQuery, adminPositionFilter, profile?.accessLevel);
      setMessage("Employee record deleted successfully.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete employee record.");
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push("/login");
    }
  }, [loading, authenticated, router]);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <header className="auth-header">
        <nav className="auth-header-nav" aria-label="Main">
          <div style={{ display: "flex", gap: ".55rem", alignItems: "center" }}>
            <a href="#attendance-actions" data-active={activeSection === "attendance-actions" ? "true" : undefined}>Home</a>
            <a href="#hr-dashboard" data-active={activeSection === "hr-dashboard" ? "true" : undefined}>Requests</a>
            <a href="#today-attendance" data-active={activeSection === "today-attendance" ? "true" : undefined}>Today</a>
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              style={{ padding: "0.48rem 0.72rem", borderRadius: 8, border: "1px solid var(--sidebar-link-border)", background: "var(--sidebar-link-bg)", color: "var(--sidebar-link-fg)", fontWeight: 600, cursor: "pointer" }}
              aria-pressed={showHistory}
            >
              History
            </button>
            <a href="#team-section" data-active={activeSection === "team-section" ? "true" : undefined}>Menu</a>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: ".5rem", alignItems: "center" }}>
            <ThemeToggle iconOnly />
            <button type="button" onClick={() => void handleLogout()} className="auth-header-logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </nav>
      </header>

      {showHistory && (
        <section style={{ marginTop: "0.6rem" }} aria-live="polite">
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.45rem", borderBottom: "1px solid var(--border)", background: "var(--surface-alt)" }}>
              <button type="button" onClick={() => setShowHistory(false)} className="btn btn-link">Close</button>
            </div>
            <div style={{ width: "100%" }}>
              <AttendanceContent />
            </div>
          </div>
        </section>
      )}

      {greeting && (
        <section style={{ ...CARD_STYLE, padding: "0.8rem 1rem" }}>
          <p style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.02rem" }}>{greeting}</p>
        </section>
      )}

      {activeSection === "attendance-actions" && (
      <section id="attendance-actions" className="tracking-card">

        {/* ── Header ── */}
        <div className="tracking-header">
          <div>
            <h2 className="tracking-title">Today Tracking</h2>
            {profile && (
              <p className="tracking-subtitle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                {profile.fullName}
              </p>
            )}
          </div>
          <span className={`tracking-status-badge${isCheckedIn ? " tracking-status-badge--in" : ""}`}>
            <span className={`tracking-status-dot${isCheckedIn ? " tracking-status-dot--in" : ""}`} />
            {isCheckedIn ? "Checked In" : "Checked Out"}
          </span>
        </div>

        {/* ── Cave loader + progress ── */}
        <div className="shift-tracker">

  <div className="shift-circle">

    <svg viewBox="0 0 120 120">

      {/* background */}

      <circle
        cx="60"
        cy="60"
        r="50"
        className="circle-bg"
      />

      {/* progress */}

      <circle
        cx="60"
        cy="60"
        r="50"
        className="circle-progress"
        strokeDasharray={314}
        strokeDashoffset={
          314 - (314 * shiftPercent) / 100
        }
      />

    </svg>

    <div className="shift-center">

      <span className="shift-percent">

        {Math.round(shiftPercent)}%

      </span>

      <span className="shift-label">

        Remaining

      </span>

    </div>

  </div>

  <div className="shift-info">

    <h3>

      Shift Progress

    </h3>

    <p>

      {formatDuration(remainingShiftSeconds)} left today

    </p>

  </div>

  <div className="shift-progress-track">

    <div
      className="shift-progress-fill"
      style={{
        width:`${shiftPercent}%`
      }}
    />

  </div>

  <div className="shift-stats">

    <div>

      <strong>

        Worked

      </strong>

      <span>

        {Math.round(Math.max(0, activeShiftRecord ? (clockNow - new Date(activeShiftRecord.checkInAt).getTime()) / 1000 : 0) / 3600)}h

      </span>

    </div>

    <div>

      <strong>

        Target

      </strong>

      <span>

        8h

      </span>

    </div>

  </div>

        </div>

        {/* ── Stat cards ── */}
        <div className="tracking-stats">
          <div className="tracking-stat-card">
            <span className="tracking-stat-icon tracking-stat-icon--worked" aria-hidden="true">
              {/* timer icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            <div>
              <p className="tracking-stat-label">Worked Today</p>
              <p className="tracking-stat-value">{formatDuration(workedShiftSeconds)}</p>
            </div>
          </div>
          <div className="tracking-stat-card">
            <span className="tracking-stat-icon tracking-stat-icon--remaining" aria-hidden="true">
              {/* hourglass icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
            </span>
            <div>
              <p className="tracking-stat-label">Remaining</p>
              <p className="tracking-stat-value">{formatDuration(remainingShiftSeconds)}</p>
            </div>
          </div>
        </div>

        {/* ── Action button ── */}
        <button
          type="button"
          onClick={() => void submitAttendance(isCheckedIn ? "check-out" : "check-in")}
          disabled={submitting || loading || !canEmployeeSubmitAttendance}
          className={`tracking-action-btn${isCheckedIn ? " tracking-action-btn--out" : " tracking-action-btn--in"}`}
        >
          {isCheckedIn ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Check Out
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Check In
            </>
          )}
        </button>

        {/* ── Feedback ── */}
        {message && (
          <p className="tracking-feedback tracking-feedback--ok">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            {message}
          </p>
        )}
        {error && (
          <p className="tracking-feedback tracking-feedback--err">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </p>
        )}

        {/* ── Logout ── */}
      
      </section>
      )}

      {activeSection === "admin-dashboard" && canManageMembers && (
        <section
          id="admin-dashboard"
          style={CARD_STYLE}
        >
          <h2>HR / Admin Dashboard</h2>
          <p style={{ marginTop: "0.35rem", color: "#166534", fontWeight: 600 }}>
            Access: Admin
          </p>
          <p style={MUTED_TEXT_STYLE}>
            Search members, edit department/position/reporting line, and track each department check-in/out.
          </p>

          <div
            style={{
              marginTop: "0.75rem",
              border: "1px solid #dbe4f0",
              borderRadius: "8px",
              padding: "0.75rem",
              background: "#f8fbff",
              display: "grid",
              gap: "0.6rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Add Member</h3>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <input
                value={newMember.fullName}
                onChange={(event) => setNewMember((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="Full name"
                style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda", minWidth: "180px" }}
              />
              <input
                value={newMember.email}
                onChange={(event) => setNewMember((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email"
                style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda", minWidth: "220px" }}
              />
              <input
                value={newMember.password}
                onChange={(event) => setNewMember((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Password"
                type="password"
                style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda", minWidth: "170px" }}
              />
              <select
                value={newMember.role}
                onChange={(event) =>
                  setNewMember((prev) => ({
                    ...prev,
                    role: event.target.value as (typeof ROLE_OPTIONS)[number],
                  }))
                }
                style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <select
                value={newMember.accessLevel}
                onChange={(event) =>
                  setNewMember((prev) => ({
                    ...prev,
                    accessLevel: event.target.value as (typeof ACCESS_LEVELS)[number],
                  }))
                }
                style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
              >
                {ACCESS_LEVELS.map((access) => (
                  <option key={access} value={access}>{access}</option>
                ))}
              </select>
              <select
                value={newMember.department}
                onChange={(event) =>
                  setNewMember((prev) => ({
                    ...prev,
                    department: event.target.value as "" | (typeof DEPARTMENTS)[number],
                  }))
                }
                style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
              >
                <option value="">Department</option>
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <select
                value={newMember.position}
                onChange={(event) =>
                  setNewMember((prev) => ({
                    ...prev,
                    position: event.target.value as "" | (typeof POSITIONS)[number],
                  }))
                }
                style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
              >
                <option value="">Position</option>
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
              <select
                value={newMember.reportsToUserId}
                onChange={(event) => setNewMember((prev) => ({ ...prev, reportsToUserId: event.target.value }))}
                style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
              >
                <option value="">Reports to</option>
                {reportToCandidates.length === 0 && (
                  <option value="" disabled>No head/manager/ceo found</option>
                )}
                {reportToCandidates.map((candidate) => (
                  <option key={candidate.userId} value={candidate.userId}>
                    {candidate.fullName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void createMember()}
                disabled={adminLoading}
                style={{
                  border: "none",
                  background: "#0369a1",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "0.55rem 0.9rem",
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            <input
              value={adminQuery}
              onChange={(event) => setAdminQuery(event.target.value)}
              placeholder="Search by name"
              style={{ padding: "0.65rem", borderRadius: "8px", border: "1px solid #c6ceda", minWidth: "220px" }}
            />
            <select
              value={adminPositionFilter}
              onChange={(event) => setAdminPositionFilter(event.target.value)}
              style={{ padding: "0.65rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
            >
              <option value="">All positions</option>
              {POSITIONS.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleAdminSearch()}
              disabled={adminLoading}
              style={{
                border: "none",
                background: "#1e7a48",
                color: "#fff",
                borderRadius: "8px",
                padding: "0.65rem 1rem",
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </div>

          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "0.5rem" }}>Name</th>
                  <th style={{ padding: "0.5rem" }}>Role</th>
                  <th style={{ padding: "0.5rem" }}>Access</th>
                  <th style={{ padding: "0.5rem" }}>Department</th>
                  <th style={{ padding: "0.5rem" }}>Position</th>
                  <th style={{ padding: "0.5rem" }}>Reports To</th>
                  <th style={{ padding: "0.5rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminVisibleMembers.map((member) => (
                  <tr key={member.userId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.5rem" }}>{member.fullName}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={member.role}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAdminMembers((prev) =>
                            prev.map((item) =>
                              item.userId === member.userId
                                ? { ...item, role: value as ManageMember["role"] }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={member.accessLevel}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAdminMembers((prev) =>
                            prev.map((item) =>
                              item.userId === member.userId
                                ? { ...item, accessLevel: value as ManageMember["accessLevel"] }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        {ACCESS_LEVELS.map((access) => (
                          <option key={access} value={access}>{access}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={member.department ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAdminMembers((prev) =>
                            prev.map((item) =>
                              item.userId === member.userId
                                ? { ...item, department: (value || null) as ManageMember["department"] }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        <option value="">-</option>
                        {DEPARTMENTS.map((department) => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={member.position ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAdminMembers((prev) =>
                            prev.map((item) =>
                              item.userId === member.userId
                                ? { ...item, position: (value || null) as ManageMember["position"] }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        <option value="">-</option>
                        {POSITIONS.map((position) => (
                          <option key={position} value={position}>{position}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={member.reportsToUserId ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAdminMembers((prev) =>
                            prev.map((item) =>
                              item.userId === member.userId
                                ? {
                                    ...item,
                                    reportsToUserId: value || null,
                                    reportsToName:
                                      prev.find((candidate) => candidate.userId === value)?.fullName ?? null,
                                  }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        <option value="">-</option>
                        {reportToCandidates
                          .filter((candidate) => candidate.userId !== member.userId)
                          .map((candidate) => (
                            <option key={candidate.userId} value={candidate.userId}>
                              {candidate.fullName} ({candidate.position ?? "-"})
                            </option>
                          ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => void updateManagedMember(member)}
                          disabled={adminLoading}
                          style={{
                            border: "none",
                            background: "#0f766e",
                            color: "#fff",
                            borderRadius: "6px",
                            padding: "0.45rem 0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteMember(member.userId)}
                          disabled={adminLoading}
                          style={{
                            border: "none",
                            background: "#b91c1c",
                            color: "#fff",
                            borderRadius: "6px",
                            padding: "0.45rem 0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: "1rem" }}>Client Reporting (Each Client Reports To)</h3>
          <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "0.5rem" }}>Client Name</th>
                  <th style={{ padding: "0.5rem" }}>Department</th>
                  <th style={{ padding: "0.5rem" }}>Position</th>
                  <th style={{ padding: "0.5rem" }}>Reports To</th>
                  <th style={{ padding: "0.5rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {clientMembers.map((member) => (
                  <tr key={member.userId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.5rem" }}>{member.fullName}</td>
                    <td style={{ padding: "0.5rem" }}>{member.department ?? "-"}</td>
                    <td style={{ padding: "0.5rem" }}>{member.position ?? "-"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={member.reportsToUserId ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAdminMembers((prev) =>
                            prev.map((item) =>
                              item.userId === member.userId
                                ? {
                                    ...item,
                                    reportsToUserId: value || null,
                                    reportsToName:
                                      prev.find((candidate) => candidate.userId === value)?.fullName ?? null,
                                  }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        <option value="">-</option>
                        {reportToCandidates.length === 0 && (
                          <option value="" disabled>No head/manager/ceo found</option>
                        )}
                        {reportToCandidates.map((candidate) => (
                          <option key={candidate.userId} value={candidate.userId}>
                            {candidate.fullName} ({candidate.role})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => void updateManagedMember(member)}
                        disabled={adminLoading}
                        style={{
                          border: "none",
                          background: "#0f766e",
                          color: "#fff",
                          borderRadius: "6px",
                          padding: "0.45rem 0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: "1rem" }}>All Records From public.employees</h3>

          <div
            style={{
              marginTop: "0.65rem",
              border: "1px solid #dbe4f0",
              borderRadius: "8px",
              padding: "0.75rem",
              background: "#f8fbff",
              display: "flex",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            <input
              value={newEmployeeRow.fullName}
              onChange={(event) =>
                setNewEmployeeRow((prev) => ({
                  ...prev,
                  fullName: event.target.value,
                }))
              }
              placeholder="Full name"
              style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda", minWidth: "190px" }}
            />
            <select
              value={newEmployeeRow.department}
              onChange={(event) =>
                setNewEmployeeRow((prev) => ({
                  ...prev,
                  department: event.target.value as (typeof DEPARTMENTS)[number],
                }))
              }
              style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
            >
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            <select
              value={newEmployeeRow.position}
              onChange={(event) =>
                setNewEmployeeRow((prev) => ({
                  ...prev,
                  position: event.target.value as (typeof POSITIONS)[number],
                }))
              }
              style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
            >
              {POSITIONS.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
            <select
              value={newEmployeeRow.reportsToEmployeeId}
              onChange={(event) =>
                setNewEmployeeRow((prev) => ({
                  ...prev,
                  reportsToEmployeeId: event.target.value,
                }))
              }
              style={{ padding: "0.55rem", borderRadius: "8px", border: "1px solid #c6ceda" }}
            >
              <option value="">Reports to</option>
              {employeeReportToCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName} ({candidate.position})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void createEmployeeRow()}
              disabled={adminLoading}
              style={{
                border: "none",
                background: "#1e7a48",
                color: "#fff",
                borderRadius: "8px",
                padding: "0.55rem 0.9rem",
                cursor: "pointer",
              }}
            >
              Add Employee Record
            </button>
          </div>

          <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "0.5rem" }}>ID</th>
                  <th style={{ padding: "0.5rem" }}>Full Name</th>
                  <th style={{ padding: "0.5rem" }}>Department</th>
                  <th style={{ padding: "0.5rem" }}>Position</th>
                  <th style={{ padding: "0.5rem" }}>Reports To</th>
                  <th style={{ padding: "0.5rem" }}>Created At</th>
                  <th style={{ padding: "0.5rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {employeesTableRows.map((employeeRow) => (
                  <tr key={employeeRow.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.5rem", fontFamily: "var(--font-geist-mono), monospace" }}>{employeeRow.id}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <input
                        value={employeeRow.fullName}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEmployeesTableRows((prev) =>
                            prev.map((item) =>
                              item.id === employeeRow.id ? { ...item, fullName: value } : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.45rem", borderRadius: "6px", border: "1px solid #c6ceda", minWidth: "160px" }}
                      />
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={employeeRow.department}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEmployeesTableRows((prev) =>
                            prev.map((item) =>
                              item.id === employeeRow.id
                                ? { ...item, department: value as EmployeeTableRecord["department"] }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.45rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        {DEPARTMENTS.map((department) => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={employeeRow.position}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEmployeesTableRows((prev) =>
                            prev.map((item) =>
                              item.id === employeeRow.id
                                ? { ...item, position: value as EmployeeTableRecord["position"] }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.45rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        {POSITIONS.map((position) => (
                          <option key={position} value={position}>{position}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={employeeRow.reportsToEmployeeId ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEmployeesTableRows((prev) =>
                            prev.map((item) =>
                              item.id === employeeRow.id
                                ? {
                                    ...item,
                                    reportsToEmployeeId: value || null,
                                    reportsToEmployeeName:
                                      prev.find((candidate) => candidate.id === value)?.fullName ?? null,
                                  }
                                : item,
                            ),
                          );
                        }}
                        style={{ padding: "0.45rem", borderRadius: "6px", border: "1px solid #c6ceda" }}
                      >
                        <option value="">-</option>
                        {employeeReportToCandidates
                          .filter((candidate) => candidate.id !== employeeRow.id)
                          .map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.fullName} ({candidate.position})
                            </option>
                          ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem" }}>{formatDateTime(employeeRow.createdAt)}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => void updateEmployeeRow(employeeRow)}
                          disabled={adminLoading}
                          style={{
                            border: "none",
                            background: "#0f766e",
                            color: "#fff",
                            borderRadius: "6px",
                            padding: "0.45rem 0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteEmployeeRow(employeeRow.id)}
                          disabled={adminLoading}
                          style={{
                            border: "none",
                            background: "#b91c1c",
                            color: "#fff",
                            borderRadius: "6px",
                            padding: "0.45rem 0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>
      )}

      {activeSection === "admin-dashboard" && !canManageMembers && (
        <section id="admin-dashboard" style={CARD_STYLE}>
          <h2>HR / Admin Dashboard</h2>
          <p style={{ marginTop: "0.5rem", color: "#b42318" }}>
            This section is available for admin access only.
          </p>
        </section>
      )}

      {activeSection === "hr-dashboard" && (
        <section
          id="hr-dashboard"
          style={CARD_STYLE}
        >
          <h2>Request Leave</h2>
          <p style={{ marginTop: "0.5rem", color: "#3f5f4c" }}>
            Submit a request for vacation or sick leave.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              setMessage(null);
              
              const formData = new FormData(e.currentTarget);
              const leaveType = formData.get("leaveType") as string;
              const startDate = formData.get("startDate") as string;
              const endDate = formData.get("endDate") as string;
              const notes = formData.get("notes") as string;

              try {
                await fetchJsonWithAccessToken<{ success: boolean }>("/api/attendance/leave", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ leaveType, startDate, endDate, notes }),
                });
                setMessage("Leave request submitted successfully.");
                (e.target as HTMLFormElement).reset();
                await loadMyTickets();
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to submit leave request.");
              } finally {
                setSubmitting(false);
              }
            }}
            style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}
          >
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>Leave Type</label>
              <select name="leaveType" required style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                <option value="vacation">Vacation</option>
                <option value="sickleave">Sick Leave</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>Start Date</label>
                <input type="date" name="startDate" required style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>End Date</label>
                <input type="date" name="endDate" required style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>Comments (Optional)</label>
              <textarea name="notes" rows={3} style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} placeholder="Reason for leave..."></textarea>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="primary-button"
              style={{ width: "100%", padding: "0.75rem", background: "#15803d", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>

          {message && (
            <p style={{ marginTop: "0.9rem", color: "#166534", fontWeight: 600 }}>
              {message}
            </p>
          )}

          {error && (
            <p style={{ marginTop: "0.9rem", color: "#b42318", fontWeight: 600 }}>
              {error}
            </p>
          )}

          <div style={{ marginTop: "2rem" }}>
            <h3>My Leave Requests</h3>

            {myTickets.length === 0 ? (
              <p style={{ marginTop: "0.75rem", color: "#3f5f4c" }}>
                No leave requests yet. Submit one and it will appear here.
              </p>
            ) : (
              <div style={{ marginTop: "1rem", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "0.5rem" }}>Date Range</th>
                      <th style={{ padding: "0.5rem" }}>Type</th>
                      <th style={{ padding: "0.5rem" }}>Status</th>
                      <th style={{ padding: "0.5rem" }}>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTickets.map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "0.5rem" }}>{t.start_date} - {t.end_date}</td>
                        <td style={{ padding: "0.5rem", textTransform: "capitalize" }}>{t.leave_type === "sickleave" ? "Sick Leave" : "Vacation"}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: t.status === "approved" ? "#dcfce7" : t.status === "rejected" ? "#fee2e2" : "#fef3c7",
                            color: t.status === "approved" ? "#166534" : t.status === "rejected" ? "#991b1b" : "#b45309",
                            textTransform: "capitalize",
                            fontWeight: 500
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem" }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </section>
        )}

      {activeSection === "team-section" && (
      <section
        id="team-section"
        style={CARD_STYLE}
      >
        <h2>My Department Team</h2>
        <p style={MUTED_TEXT_STYLE}>
          Department: {teamDepartment ?? "-"}
        </p>

        {!loading && teamMembers.length === 0 && (
          <p style={{ marginTop: "0.75rem" }}>No members found in your department yet.</p>
        )}

        {teamMembers.length > 0 && (
          <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "0.5rem" }}>Name</th>
                  <th style={{ padding: "0.5rem" }}>Role</th>
                  <th style={{ padding: "0.5rem" }}>Position</th>
                  <th style={{ padding: "0.5rem" }}>Reports To</th>
                  <th style={{ padding: "0.5rem" }}>Checked In</th>
                  <th style={{ padding: "0.5rem" }}>Vacation</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.userId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.5rem" }}>{member.fullName}</td>
                    <td style={{ padding: "0.5rem" }}>{member.role}</td>
                    <td style={{ padding: "0.5rem" }}>{member.position ?? "-"}</td>
                    <td style={{ padding: "0.5rem" }}>{member.reportsToName ?? "-"}</td>
                    <td style={{ padding: "0.5rem", color: member.isCheckedIn ? "#047857" : "#6b7280" }}>
                      {member.isCheckedIn ? "Yes" : "No"}
                    </td>
                    <td style={{ padding: "0.5rem", color: member.isOnVacation ? "#b45309" : "#6b7280" }}>
                      {member.isOnVacation ? "On vacation" : "Working"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {activeSection === "today-attendance" && (
      <section
        id="today-attendance"
        style={CARD_STYLE}
      >
        <h2>Today Attendance</h2>
        {loading && <p style={{ marginTop: "0.75rem" }}>Loading records...</p>}
        {!loading && attendance.length === 0 && (
          <p style={{ marginTop: "0.75rem" }}>No attendance records yet today.</p>
        )}

        {!loading && attendance.length > 0 && (
          <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "0.5rem" }}>Employee</th>
                  <th style={{ padding: "0.5rem" }}>Department</th>
                  <th style={{ padding: "0.5rem" }}>Position</th>
                  <th style={{ padding: "0.5rem" }}>Check In</th>
                  <th style={{ padding: "0.5rem" }}>Check Out</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.5rem" }}>{record.employeeName}</td>
                    <td style={{ padding: "0.5rem" }}>{record.department}</td>
                    <td style={{ padding: "0.5rem" }}>{record.position}</td>
                    <td style={{ padding: "0.5rem" }}>{formatDateTime(record.checkInAt)}</td>
                    <td style={{ padding: "0.5rem" }}>{formatDateTime(record.checkOutAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
