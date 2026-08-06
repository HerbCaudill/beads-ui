import { cn } from "../../lib/cn"
import { stripTaskPrefix } from "../../lib/stripTaskPrefix"
import { useBeadsViewStore, selectIssuePrefix } from "../../store"
import {
  IconCircle,
  IconCircleCheck,
  IconBan,
  IconClock,
  IconBug,
  IconSparkles,
  IconStack2,
  IconLoader2,
  type TablerIcon,
} from "@tabler/icons-react"
import { CopyableTaskId } from "./CopyableTaskId"
import type { Task, TaskStatus } from "../../types"

/**
 * Single source of truth for task row layout: status icon, ID, title,
 * optional extra content, and right-aligned type/priority badges.
 * Used directly in combobox items and composed by TaskCard for interactive use.
 */
export function TaskCardCompact({
  task,
  className,
  showStatusIcon = true,
  children,
}: TaskCardCompactProps) {
  const issuePrefix = useBeadsViewStore(selectIssuePrefix)
  const config = statusConfig[task.status]
  const StatusIcon = config.icon
  const displayId = stripTaskPrefix(task.id, issuePrefix)
  const typeDetails = task.issue_type ? typeConfig[task.issue_type] : undefined
  const priorityDetails = task.priority !== undefined ? priorityConfig[task.priority] : undefined

  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      {/* Status icon */}
      {showStatusIcon && (
        <StatusIcon className={cn("size-3.5 shrink-0", config.color, config.animate)} />
      )}

      {/* Task ID - click to copy */}
      <CopyableTaskId taskId={task.id} displayId={displayId} />

      {/* Title */}
      <span
        className={cn(
          "min-w-0 shrink truncate text-xs",
          task.status === "closed" && "line-through",
        )}
      >
        {task.title}
      </span>

      {/* Optional extra content such as a subtask count. */}
      {children}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Type and priority indicators */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Issue type icon (only for non-task types) - placeholder for alignment */}
        {task.issue_type !== "task" && typeDetails ? (
          <span
            className={cn("flex items-center", typeDetails.color)}
            title={typeDetails.label}
            aria-label={`Type: ${typeDetails.label}`}
          >
            {(() => {
              const TypeIcon = typeDetails.icon
              return <TypeIcon className="size-3.5" />
            })()}
          </span>
        ) : (
          <div className="h-3.5 w-3.5" aria-hidden="true" />
        )}

        {/* Priority badge (only for non-P2) */}
        {task.priority !== 2 && priorityDetails && (
          <span
            className={cn(
              "rounded px-1 py-0.5 text-[10px] leading-none font-medium",
              priorityDetails.color,
              priorityDetails.bgColor,
            )}
            title={`Priority: ${priorityDetails.label}`}
            aria-label={`Priority: ${priorityDetails.label}`}
          >
            {priorityDetails.label}
          </span>
        )}
      </div>
    </div>
  )
}

/** Status icon, color, and label configuration. Exported for use by TaskCard's interactive status elements. */
export const statusConfig: Record<TaskStatus, StatusConfig> = {
  open: {
    icon: IconCircle,
    label: "Open",
    color: "text-status-neutral",
    bgColor: "bg-status-neutral/10",
  },
  in_progress: {
    icon: IconLoader2,
    label: "In progress",
    color: "text-status-info",
    bgColor: "bg-status-info/10",
    animate: "animate-spin",
  },
  blocked: {
    icon: IconBan,
    label: "Blocked",
    color: "text-status-error",
    bgColor: "bg-status-error/10",
  },
  deferred: {
    icon: IconClock,
    label: "Deferred",
    color: "text-status-warning",
    bgColor: "bg-status-warning/10",
  },
  closed: {
    icon: IconCircleCheck,
    label: "Closed",
    color: "text-status-success",
    bgColor: "bg-status-success/10",
  },
}

/** Issue type icon configuration. */
const typeConfig: Record<string, TypeConfig> = {
  bug: { icon: IconBug, label: "Bug", color: "text-status-error" },
  feature: { icon: IconSparkles, label: "Feature", color: "text-repo-accent" },
  epic: { icon: IconStack2, label: "Epic", color: "text-repo-accent" },
}

/** Priority badge configuration. */
const priorityConfig: Record<number, PriorityConfig> = {
  0: { label: "P0", color: "text-white", bgColor: "bg-red-600" },
  1: { label: "P1", color: "text-white", bgColor: "bg-orange-600" },
  3: { label: "P3", color: "text-white", bgColor: "bg-yellow-500" },
  4: { label: "P4", color: "text-white", bgColor: "bg-yellow-400" },
}

/** Props for the TaskCardCompact component. */
export type TaskCardCompactProps = {
  /** The task data to display. */
  task: Task
  /** Additional CSS classes for the outer container. */
  className?: string
  /** Whether to render the status icon (default true). Set false when the caller renders its own interactive status element. */
  showStatusIcon?: boolean
  /** Extra content rendered between the title and the right-aligned badges. */
  children?: React.ReactNode
}

/** Status configuration with icon, label, colors, and optional animation. */
export type StatusConfig = {
  icon: TablerIcon
  label: string
  color: string
  bgColor: string
  animate?: string
}

type TypeConfig = {
  icon: TablerIcon
  label: string
  color: string
}

type PriorityConfig = {
  label: string
  color: string
  bgColor: string
}
