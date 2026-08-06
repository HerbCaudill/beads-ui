/**
 * Presentation-only entry point.
 *
 * Everything exported here renders from props alone — no API calls, no websocket,
 * no `@beads/components` (which statically pulls in shiki). This is what non-app
 * consumers such as the MCP widget import, so the task list looks identical
 * wherever it is rendered.
 */

export { CopyableTaskId, type CopyableTaskIdProps } from "./components/tasks/CopyableTaskId"
export {
  GroupedTaskList,
  type GroupedTaskListProps,
  type TaskGroupDescriptor,
} from "./components/tasks/GroupedTaskList"
export { TaskCard, type TaskCardProps } from "./components/tasks/TaskCard"
export {
  TaskCardCompact,
  statusConfig,
  type TaskCardCompactProps,
  type StatusConfig,
} from "./components/tasks/TaskCardCompact"
export { TaskGroupHeader } from "./components/tasks/TaskGroupHeader"
export { TaskSubtree, type TaskSubtreeProps } from "./components/tasks/TaskSubtree"

export { buildTaskTree } from "./lib/buildTaskTree"
export { cn } from "./lib/cn"
export { countDescendants } from "./lib/countDescendants"
export { formatRelativeTime } from "./lib/formatRelativeTime"
export { stripTaskPrefix } from "./lib/stripTaskPrefix"

export { BeadsViewProvider } from "./store/BeadsViewProvider"
export { createBeadsViewStore } from "./store/createBeadsViewStore"

export type { Comment, RelatedTask, Task, TaskStatus, TaskTreeNode } from "./types"
