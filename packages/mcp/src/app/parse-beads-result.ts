import { IssueListResultSchema } from "./issue-list-result-schema.js"
import { IssueResultSchema } from "./issue-result-schema.js"
import type { BeadsResult } from "./types.js"

/** Parse structured MCP tool output into a supported Beads view model. */
export function parseBeadsResult(
  /** Unknown structured content supplied by an MCP host. */
  value: unknown,
): BeadsResult | undefined {
  const listResult = IssueListResultSchema.safeParse(value)
  if (listResult.success) return listResult.data

  const issueResult = IssueResultSchema.safeParse(value)
  return issueResult.success ? issueResult.data : undefined
}
