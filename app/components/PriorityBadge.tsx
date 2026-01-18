/**
 * PriorityBadge component.
 *
 * Displays a colored badge for a priority value (0..4).
 */
import { emojiForPriority } from "../utils/priority-badge.js"
import { priority_levels, type PriorityLevel } from "../utils/priority.js"

export interface PriorityBadgeProps {
  /** The priority value (0-4). Defaults to 2 (Medium) if not provided. */
  priority: number | null | undefined
}

/**
 * Get the label for a priority level.
 *
 * @param p - The priority value.
 */
function labelForPriority(p: number): string {
  const i = Math.max(0, Math.min(4, p)) as PriorityLevel
  return priority_levels[i] ?? "Medium"
}

/**
 * Badge displaying a priority level with appropriate styling.
 *
 * @param props - Component props.
 */
export function PriorityBadge({ priority }: PriorityBadgeProps): React.JSX.Element {
  const p = typeof priority === "number" ? priority : 2
  const label = labelForPriority(p)
  const emoji = emojiForPriority(p)
  const class_name = `priority-badge is-p${Math.max(0, Math.min(4, p))}`

  return (
    <span className={class_name} role="img" title={label} aria-label={`Priority: ${label}`}>
      {emoji} {label}
    </span>
  )
}
