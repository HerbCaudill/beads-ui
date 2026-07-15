import { fetchJson } from "./fetch-json.js"
import type { IssueDetail } from "./types.js"

/** Load one task with relationships and comments. */
export function getIssue(
  /** Stable identifier of the task to load. */
  issueId: string,
): Promise<IssueDetail> {
  return fetchJson<IssueDetail>(`/api/issues/${encodeURIComponent(issueId)}`)
}
