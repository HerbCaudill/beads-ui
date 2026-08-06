import type { TaskStatus } from "@beads/ui/presentation"

/**
 * Status groups shown in the issue list, in workflow order.
 *
 * Icons and colors come from `statusConfig` in `@beads/ui`; only the ordering and
 * the widget's own labels are defined here.
 */
export const STATUS_GROUPS: readonly StatusGroup[] = [
  { label: "In progress", status: "in_progress" },
  { label: "Blocked", status: "blocked" },
  { label: "Ready", status: "open" },
  { label: "Deferred", status: "deferred" },
  { label: "Closed", status: "closed" },
]

/** One status group heading in the issue list. */
export type StatusGroup = {
  /** User-facing group label. */
  readonly label: string
  /** Beads status collected under the label. */
  readonly status: TaskStatus
}
