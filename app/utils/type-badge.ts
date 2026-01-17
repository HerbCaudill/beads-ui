import type { IssueType } from "./issue-type.js"

const KNOWN_TYPES: Set<string> = new Set(["bug", "feature", "task", "epic", "chore"])

/**
 * Create a compact, colored badge for an issue type.
 */
export function createTypeBadge(issue_type: string | undefined | null): HTMLSpanElement {
  const el = document.createElement("span")
  el.className = "type-badge"

  const t = (issue_type ?? "").toString().toLowerCase()
  const kind = KNOWN_TYPES.has(t) ? t : "neutral"
  el.classList.add(`type-badge--${kind}`)
  el.setAttribute("role", "img")

  const label = KNOWN_TYPES.has(t) ? labelForType(t as IssueType) : "\u2014" // em-dash
  el.setAttribute("aria-label", KNOWN_TYPES.has(t) ? `Issue type: ${label}` : "Issue type: unknown")
  el.setAttribute("title", KNOWN_TYPES.has(t) ? `Type: ${label}` : "Type: unknown")
  el.textContent = label
  return el
}

function labelForType(t: IssueType): string {
  switch (t) {
    case "bug":
      return "Bug"
    case "feature":
      return "Feature"
    case "task":
      return "Task"
    case "epic":
      return "Epic"
    case "chore":
      return "Chore"
  }
}
