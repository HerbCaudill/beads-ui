import type { Issue } from "@beads/sdk"

import { STATUS_CONFIG, type StatusConfig } from "./status-config.js"

/** Group issues in a stable workflow order, omitting empty groups. */
export function getIssueGroups(
  /** Issues visible after filtering. */
  issues: readonly Issue[],
): readonly IssueGroup[] {
  return STATUS_CONFIG.map((config) => ({
    config,
    issues: issues.filter((issue) => issue.status === config.status),
  })).filter((group) => group.issues.length > 0)
}

/** One visible group of issues sharing a workflow status. */
export type IssueGroup = {
  /** Presentation details for the status. */
  readonly config: StatusConfig
  /** Issues belonging to the status. */
  readonly issues: readonly Issue[]
}
