import type { HealthResponse } from "@/backend_lib/types/health.types";

export function getHealth(): HealthResponse {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    debug: process.env.DEBUG === "true",
  };
}
