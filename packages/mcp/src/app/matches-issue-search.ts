import type { Issue } from "@beads/sdk"

/** Check whether an issue contains a case-insensitive search query. */
export function matchesIssueSearch(
  /** Issue to inspect. */
  issue: Issue,
  /** User-entered search query. */
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return true

  return [issue.id, issue.title, issue.description ?? "", ...issue.labels].some((value) =>
    value.toLocaleLowerCase().includes(normalizedQuery),
  )
}
