import { getSupabaseServerClient } from "@/backend_lib/infrastructure/supabase.server";

type VacationRow = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: "approved" | "pending" | "rejected";
  notes: string | null;
  employees:
    | {
        full_name: string;
        department: string;
        position: string;
      }
    | {
        full_name: string;
        department: string;
        position: string;
      }[]
    | null;
};

export interface VacationRequestItem {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string | null;
  position: string | null;
  startDate: string;
  endDate: string;
  status: "approved" | "pending" | "rejected";
  notes: string | null;
}

export async function listVacationRequests(): Promise<VacationRequestItem[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("employee_vacations")
    .select("id, employee_id, start_date, end_date, status, notes, employees(full_name, department, position)")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as VacationRow[]).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: employee?.full_name ?? "Unknown",
      department: employee?.department ?? null,
      position: employee?.position ?? null,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      notes: row.notes,
    };
  });
}

export async function decideVacationRequest(input: {
  id: string;
  decision: "approved" | "rejected";
}): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("employee_vacations")
    .update({ status: input.decision })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }
}
