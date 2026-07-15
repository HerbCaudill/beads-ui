import { listIssues } from "@beads/sdk"

import type { ServerOptions } from "./types.js"

/** Read a stable fingerprint of issue data visible to the application. */
export async function getWorkspaceFingerprint(
  /** Server dependencies and immutable workspace path. */
  options: ServerOptions,
): Promise<string> {
  return JSON.stringify(await listIssues(options))
}
