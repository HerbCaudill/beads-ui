import type { Issue } from "@beads/sdk"

/** Filter closed issues from the default active-work view. */
export function filterIssues(
  /** Complete issue collection returned by Beads. */
  issues: readonly Issue[],
  /** Whether completed issues should remain visible. */
  includeClosed: boolean,
): readonly Issue[] {
  if (includeClosed) return issues
  return issues.filter((issue) => issue.status !== "closed")
}
