import type { Issue, IssueDetail } from "@beads/sdk"

/** Dependencies required to expose one fixed Beads workspace over MCP. */
export type CreateBeadsMcpServerOptions = {
  /** Load one issue with its related data. */
  readonly getIssue: (id: string) => Promise<IssueDetail | Issue>
  /** Load all issues in the workspace. */
  readonly listIssues: () => Promise<readonly Issue[]>
  /** Bundled HTML served as the inline MCP App. */
  readonly viewHtml: string
  /** Absolute path to the fixed Beads workspace. */
  readonly workspace: string
}
