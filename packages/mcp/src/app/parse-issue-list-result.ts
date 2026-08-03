import { IssueListResultSchema } from "./issue-list-result-schema.js"
import type { IssueListResult } from "./types.js"

/** Parse structured MCP tool output into the issue-list view model. */
export function parseIssueListResult(
  /** Unknown structured content supplied by an MCP host. */
  value: unknown,
): IssueListResult | undefined {
  const result = IssueListResultSchema.safeParse(value)
  return result.success ? result.data : undefined
}
