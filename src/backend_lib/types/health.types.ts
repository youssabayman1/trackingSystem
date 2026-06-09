export type HealthStatus = "ok";

export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  debug: boolean;
}
