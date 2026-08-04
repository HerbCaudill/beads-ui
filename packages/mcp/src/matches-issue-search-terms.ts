import type { Issue } from "@beads/sdk"

import type { IssueSearchTerm } from "./search-query-types.js"

/** Short Beads issue-type aliases accepted by issue search. */
const ISSUE_TYPE_ALIASES: Readonly<Record<string, string>> = {
  adr: "decision",
  dec: "decision",
  feat: "feature",
  mol: "molecule",
  mr: "merge-request",
}

/** Check whether an SDK issue matches parsed search terms. */
export function matchesIssueSearchTerms(
  /** Issue to search. */
  issue: Issue,
  /** Parsed terms to match. */
  terms: readonly IssueSearchTerm[],
  /** Issue prefix configured for the workspace. */
  issuePrefix?: string,
): boolean {
  const searchableFields = [issue.id, issue.title, issue.description ?? ""].map((value) =>
    value.toLowerCase(),
  )

  return terms.every((term) => {
    let matches = false

    if (term.kind === "text") {
      const value = term.value.toLowerCase()
      matches = searchableFields.some((field) => field.includes(value))
    } else {
      switch (term.field) {
        case "status": {
          matches = term.values.some(
            (value) =>
              value.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_") === issue.status,
          )
          break
        }
        case "label": {
          const labels = issue.labels.map((label) => label.toLowerCase())
          matches = term.values.some((value) => labels.includes(value.toLowerCase()))
          break
        }
        case "priority": {
          matches = term.values.some((value) => {
            const parsed = /^(<=|>=)?p?([0-4])$/i.exec(value)
            if (!parsed) return false

            const comparison = parsed[1]
            const priority = Number(parsed[2])
            if (comparison === "<=") return issue.priority <= priority
            if (comparison === ">=") return issue.priority >= priority
            return issue.priority === priority
          })
          break
        }
        case "type": {
          matches = term.values.some((value) => {
            const normalized = value.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-")
            return issue.type === (ISSUE_TYPE_ALIASES[normalized] ?? normalized)
          })
          break
        }
        case "parent": {
          const parent = issue.parent?.toLowerCase()
          matches =
            parent !== undefined &&
            term.values.some((value) => {
              const normalized = value.toLowerCase()
              if (parent === normalized) return true
              if (!issuePrefix) return false
              return parent === `${issuePrefix.toLowerCase()}-${normalized}`
            })
          break
        }
        case "is": {
          matches = term.values.some((value) => {
            const normalized = value.toLowerCase()
            if (normalized === "ready") return issue.isReady === true
            if (normalized === "root") return !issue.parent
            return false
          })
          break
        }
      }
    }

    return term.excluded ? !matches : matches
  })
}
