export function readEmployeeId(body: unknown): string {
  if (typeof body !== "object" || body === null || !("employeeId" in body)) {
    throw new Error("employeeId is required.");
  }

  const employeeId = (body as { employeeId: unknown }).employeeId;

  if (typeof employeeId !== "string" || employeeId.trim().length === 0) {
    throw new Error("employeeId must be a non-empty string.");
  }

  return employeeId;
}
