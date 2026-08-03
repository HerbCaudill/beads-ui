import type { Issue } from "@beads/sdk"

/** Structured content returned by the issue-list MCP tool. */
export type IssueListResult = {
  /** Whether the result includes completed issues. */
  readonly includeClosed: boolean
  /** Normalized issues included in the result. */
  readonly issues: readonly Issue[]
  /** Absolute path to the queried Beads workspace. */
  readonly workspace: string
}
