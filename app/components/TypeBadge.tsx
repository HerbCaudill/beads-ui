/**
 * TypeBadge component.
 *
 * Displays a compact, colored badge for an issue type.
 */
import type { IssueType } from "../utils/issue-type.js"

const KNOWN_TYPES = new Set<string>(["bug", "feature", "task", "epic", "chore"])

/**
 * Get the display label for an issue type.
 *
 * @param t - The issue type.
 */
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

export interface TypeBadgeProps {
  /** The issue type to display. */
  issue_type: string | undefined | null
}

/**
 * Badge displaying an issue type with appropriate styling.
 *
 * @param props - Component props.
 */
export function TypeBadge({ issue_type }: TypeBadgeProps): React.JSX.Element {
  const t = (issue_type ?? "").toString().toLowerCase()
  const kind = KNOWN_TYPES.has(t) ? t : "neutral"
  const label = KNOWN_TYPES.has(t) ? labelForType(t as IssueType) : "\u2014" // em-dash
  const aria_label = KNOWN_TYPES.has(t) ? `Issue type: ${label}` : "Issue type: unknown"
  const title = KNOWN_TYPES.has(t) ? `Type: ${label}` : "Type: unknown"

  return (
    <span
      className={`type-badge type-badge--${kind}`}
      role="img"
      aria-label={aria_label}
      title={title}
    >
      {label}
    </span>
  )
}
