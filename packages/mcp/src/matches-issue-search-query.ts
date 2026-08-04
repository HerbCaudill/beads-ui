import type { Issue } from "@beads/sdk"

import { matchesIssueSearchTerms } from "./matches-issue-search-terms.js"
import { parseIssueSearchQuery } from "./parse-issue-search-query.js"

/** Check whether an SDK issue matches a free-text and structured search query. */
export function matchesIssueSearchQuery(
  /** Issue to search. */
  issue: Issue,
  /** Query string to match. */
  query: string,
  /** Issue prefix configured for the workspace. */
  issuePrefix?: string,
): boolean {
  return matchesIssueSearchTerms(issue, parseIssueSearchQuery(query), issuePrefix)
}
