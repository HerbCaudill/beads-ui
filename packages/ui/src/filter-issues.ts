import type { Issue, IssueStatus } from "./types.js"

/** Filter tasks by title, identifier, description, or label. */
export function filterIssues(
  /** Tasks available in the workspace. */
  issues: readonly Issue[],
  /** Case-insensitive search text. */
  search: string,
  /** Optional workflow status filter. */
  status: IssueStatus | "all" = "all",
): readonly Issue[] {
  const query = search.trim().toLocaleLowerCase()
  return issues.filter(
    (issue) =>
      (status === "all" || issue.status === status) &&
      (!query ||
        [issue.id, issue.title, issue.description ?? "", ...issue.labels].some((value) =>
          value.toLocaleLowerCase().includes(query),
        )),
  )
}
