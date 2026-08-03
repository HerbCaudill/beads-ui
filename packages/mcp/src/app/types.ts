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

/** Fixture set shown in the browser preview. */
export type PreviewScenario = "active" | "all" | "empty"

/** Color scheme simulated by the browser preview. */
export type PreviewTheme = "light" | "dark"

/** Host width simulated by the browser preview. */
export type PreviewWidth = "narrow" | "wide"
