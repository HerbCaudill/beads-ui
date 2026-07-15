import { fetchJson } from "./fetch-json.js"
import type { Issue } from "./types.js"

/** Load every task from the fixed workspace. */
export function listIssues(): Promise<readonly Issue[]> {
  return fetchJson<readonly Issue[]>("/api/issues")
}
