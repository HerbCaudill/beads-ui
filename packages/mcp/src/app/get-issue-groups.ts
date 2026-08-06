import type { Task } from "@beads/ui/presentation"

import { STATUS_GROUPS, type StatusGroup } from "./status-config.js"

/** Group tasks by status in a stable workflow order, omitting empty groups. */
export function getIssueGroups(
  /** Tasks visible after filtering. */
  tasks: readonly Task[],
): readonly IssueGroup[] {
  return STATUS_GROUPS.map((group) => ({
    ...group,
    tasks: tasks.filter((task) => task.status === group.status),
  })).filter((group) => group.tasks.length > 0)
}

/** One visible group of tasks sharing a workflow status. */
export type IssueGroup = StatusGroup & {
  /** Tasks belonging to the status. */
  readonly tasks: readonly Task[]
}
