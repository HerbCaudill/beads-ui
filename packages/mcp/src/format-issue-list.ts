import type { Issue } from "@beads/sdk"

/** Format an issue collection as a compact model- and user-readable fallback. */
export function formatIssueList(
  /** Issues included in the tool result. */
  issues: readonly Issue[],
  /** Absolute path to the queried workspace. */
  workspace: string,
  /** Whether the collection includes completed work. */
  includeClosed: boolean,
): string {
  const scope = includeClosed ? "Beads" : "active Beads"
  const noun = issues.length === 1 ? "issue" : "issues"
  const heading = `${issues.length} ${scope} ${noun} in ${workspace}`
  if (issues.length === 0) return heading

  const lines = issues.map(
    (issue) =>
      `[P${issue.priority}] ${issue.id} · ${issue.status.replaceAll("_", " ")} · ${issue.title}`,
  )
  return `${heading}\n\n${lines.join("\n")}`
}
