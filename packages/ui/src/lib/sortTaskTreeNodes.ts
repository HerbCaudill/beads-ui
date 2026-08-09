import type { TaskGroup, TaskTreeNode } from "../types"

/** Sort task trees using the ordering shown in the task list. */
export function sortTaskTreeNodes(
  /** Task tree nodes to sort. */
  nodes: TaskTreeNode[],
  /** Status group whose ordering rules apply. */
  groupKey: TaskGroup,
): TaskTreeNode[] {
  const sortedNodes = [...nodes].sort((a, b) => {
    if (groupKey === "closed" || groupKey === "deferred") {
      const aTime = a.task.closed_at ? new Date(a.task.closed_at).getTime() : 0
      const bTime = b.task.closed_at ? new Date(b.task.closed_at).getTime() : 0
      return bTime - aTime
    }

    const aHasActive = treeHasActiveTask(a)
    const bHasActive = treeHasActiveTask(b)
    if (aHasActive && !bHasActive) return -1
    if (!aHasActive && bHasActive) return 1

    const priorityDiff = (a.task.priority ?? 4) - (b.task.priority ?? 4)
    if (priorityDiff !== 0) return priorityDiff

    const aIsBug = a.task.issue_type === "bug"
    const bIsBug = b.task.issue_type === "bug"
    if (aIsBug && !bIsBug) return -1
    if (!aIsBug && bIsBug) return 1

    const aTime = a.task.created_at ? new Date(a.task.created_at).getTime() : 0
    const bTime = b.task.created_at ? new Date(b.task.created_at).getTime() : 0
    return aTime - bTime
  })

  return sortedNodes.map((node) => ({
    ...node,
    children: sortTaskTreeNodes(node.children, groupKey),
  }))
}

/** Return whether a task tree contains an active descendant. */
function treeHasActiveTask(
  /** Task tree node to inspect. */
  node: TaskTreeNode,
): boolean {
  return node.children.some((child) => treeHasActiveTask(child))
}
