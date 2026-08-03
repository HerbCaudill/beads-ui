import type { Task } from "../types"
import { matchesSearchTerms } from "./matchesSearchTerms"
import { parseSearchQuery } from "./parseSearchQuery"

/** Check whether a task matches a free-text and structured search query. */
export function matchesSearchQuery(
  /** Task to search. */
  task: Task,
  /** Query string to match. */
  query: string,
  /** Issue prefix configured for the workspace. */
  issuePrefix?: string | null,
): boolean {
  if (!query.trim()) return true

  return matchesSearchTerms(task, parseSearchQuery(query), issuePrefix)
}
