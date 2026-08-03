import type { Issue, IssueDetail } from "@beads/sdk"

/** Structured content supported by the bundled MCP App. */
export type BeadsResult = IssueListResult | IssueResult

/** Structured content returned by the issue-list MCP tool. */
export type IssueListResult = {
  /** Whether the result includes completed issues. */
  readonly includeClosed: boolean
  /** Normalized issues included in the result. */
  readonly issues: readonly Issue[]
  /** Absolute path to the queried Beads workspace. */
  readonly workspace: string
}

/** Structured content returned by the single-issue MCP tool. */
export type IssueResult = {
  /** Normalized issue and any available related data. */
  readonly issue: Issue | IssueDetail
  /** Absolute path to the queried Beads workspace. */
  readonly workspace: string
}

/** Fixture set shown in the browser preview. */
export type PreviewScenario = "active" | "all" | "empty" | "single"

/** Color scheme simulated by the browser preview. */
export type PreviewTheme = "light" | "dark"

/** Host width simulated by the browser preview. */
export type PreviewWidth = "narrow" | "wide"
