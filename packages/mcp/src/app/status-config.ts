import {
  IconBan,
  IconCircle,
  IconCircleCheck,
  IconClock,
  IconLoader2,
  type TablerIcon,
} from "@tabler/icons-react"
import type { IssueStatus } from "@beads/sdk"

/** Presentation and ordering for issue status groups. */
export const STATUS_CONFIG: readonly StatusConfig[] = [
  { icon: IconLoader2, label: "In progress", status: "in_progress", tone: "info" },
  { icon: IconBan, label: "Blocked", status: "blocked", tone: "danger" },
  { icon: IconCircle, label: "Ready", status: "open", tone: "neutral" },
  { icon: IconClock, label: "Deferred", status: "deferred", tone: "warning" },
  { icon: IconCircleCheck, label: "Closed", status: "closed", tone: "success" },
]

/** Visual details for one issue status. */
export type StatusConfig = {
  /** Icon shown beside the group and issue. */
  readonly icon: TablerIcon
  /** User-facing status label. */
  readonly label: string
  /** Beads status value. */
  readonly status: IssueStatus
  /** Semantic color token applied to the status. */
  readonly tone: "danger" | "info" | "neutral" | "success" | "warning"
}
