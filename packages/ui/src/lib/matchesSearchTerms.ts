import type { Task } from "../types"
import type { SearchTerm } from "./searchQueryTypes"

/** Short Beads issue-type aliases accepted by task search. */
const ISSUE_TYPE_ALIASES: Readonly<Record<string, string>> = {
  adr: "decision",
  dec: "decision",
  feat: "feature",
  mol: "molecule",
  mr: "merge-request",
}

/** Check whether a task matches parsed free-text and structured search terms. */
export function matchesSearchTerms(
  /** Task to search. */
  task: Task,
  /** Parsed terms to match. */
  terms: readonly SearchTerm[],
  /** Issue prefix configured for the workspace. */
  issuePrefix?: string | null,
): boolean {
  const searchableFields = [task.id, task.title, task.description ?? ""].map((value) =>
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
              value.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_") === task.status,
          )
          break
        }
        case "label": {
          const labels = (task.labels ?? []).map((label) => label.toLowerCase())
          matches = term.values.some((value) => labels.includes(value.toLowerCase()))
          break
        }
        case "priority": {
          matches =
            task.priority !== undefined &&
            term.values.some((value) => {
              const parsed = /^(<=|>=)?p?([0-4])$/i.exec(value)
              if (!parsed) return false

              const comparison = parsed[1]
              const priority = Number(parsed[2])
              if (comparison === "<=") return task.priority! <= priority
              if (comparison === ">=") return task.priority! >= priority
              return task.priority === priority
            })
          break
        }
        case "type": {
          matches = term.values.some((value) => {
            const normalized = value.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-")
            return task.issue_type?.toLowerCase() === (ISSUE_TYPE_ALIASES[normalized] ?? normalized)
          })
          break
        }
        case "parent": {
          const parent = task.parent?.toLowerCase()
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
            if (normalized === "ready") return task.is_ready === true
            if (normalized === "root") return !task.parent
            return false
          })
          break
        }
      }
    }

    return term.excluded ? !matches : matches
  })
}
