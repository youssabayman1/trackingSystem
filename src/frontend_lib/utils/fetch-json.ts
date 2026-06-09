export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });

  const payload = (await response.json()) as T | { message?: string };

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? payload.message
        : undefined;

    throw new HttpError(
      message ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return payload as T;
}
