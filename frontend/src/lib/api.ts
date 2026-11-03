import type {
  Health,
  Leaderboard,
  Metrics,
  Prediction,
  Rules,
  Scan,
  Stats,
} from "@/lib/types";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/backend${path}`, { ...init, cache: "no-store" });
  } catch {
    throw new ApiError(
      "The sorting service is not running. Start the API, then try again.",
    );
  }

  if (!response.ok) {
    let message = `The request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        const parts = body.detail
          .map((item) =>
            item && typeof item === "object" && "msg" in item
              ? String((item as { msg: string }).msg)
              : "",
          )
          .filter(Boolean);
        if (parts.length > 0) message = parts.join(" ");
      }
    } catch {
      /* The body was not JSON. */
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function getHealth() {
  return request<Health>("/health");
}

export function getRules() {
  return request<Rules>("/rules");
}

export function getMetrics() {
  return request<Metrics>("/metrics");
}

export function getStats(displayName?: string) {
  const query = displayName
    ? `?display_name=${encodeURIComponent(displayName)}`
    : "";
  return request<Stats>(`/stats${query}`);
}

export function getScans(displayName: string) {
  return request<{ display_name: string; scans: Scan[] }>(
    `/scans?display_name=${encodeURIComponent(displayName)}&limit=100`,
  );
}

export function getLeaderboard() {
  return request<Leaderboard>("/leaderboard");
}

export function predict(file: File, displayName: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("display_name", displayName);
  return request<Prediction>("/predict", { method: "POST", body });
}
