import type { Issue, IssueDetail } from "@beads/sdk"

/** Format one issue as the plain-text fallback for clients without structured views. */
export function formatIssueDetail(
  /** Normalized issue returned by the Beads SDK. */
  issue: Issue | IssueDetail,
): string {
  const description = issue.description?.trim()
  const heading = `${issue.id} · P${issue.priority} · ${issue.status.replaceAll("_", " ")} · ${issue.title}`
  if (!description) return heading
  return `${heading}\n\n${description}`
}
