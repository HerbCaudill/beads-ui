import { fetchJson } from "./fetch-json.js"
import type { StatusSummary } from "./types.js"

/** Load workspace-level task counts. */
export function getStatus(): Promise<StatusSummary> {
  return fetchJson<StatusSummary>("/api/status")
}
