import { fetchJson } from "./fetch-json.js"
import type { Workspace } from "./types.js"

/** Load the fixed workspace identity. */
export function getWorkspace(): Promise<Workspace> {
  return fetchJson<Workspace>("/api/workspace")
}
