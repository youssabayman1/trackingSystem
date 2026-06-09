import { AttendanceDashboard } from "@/frontend_lib/components/attendance-dashboard";

export default function Home() {
  return (
    <div className="app-shell" style={{ maxWidth: '1000px', margin: '1rem auto' }}>
      <main className="content-area">
        <AttendanceDashboard />
      </main>
    </div>
  );
}
