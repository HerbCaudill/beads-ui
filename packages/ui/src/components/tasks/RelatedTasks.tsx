import { useEffect, useState, useCallback, useMemo } from "react"
import { Label } from "@beads/components"
import { GroupedTaskList } from "./GroupedTaskList"
import { TaskRelationCombobox } from "./TaskRelationCombobox"
import { apiFetch } from "../../lib/apiClient"
import { buildTaskTree } from "../../lib/buildTaskTree"
import { findRootAncestor } from "../../lib/findRootAncestor"
import { sortTaskTreeNodes } from "../../lib/sortTaskTreeNodes"
import type { RelatedTask, Task, TaskGroup, TaskTreeNode } from "../../types"

/**
 * Displays subtasks and blocking issues for a given task.
 * Shows grouped sections for subtasks, blockers, and dependents.
 * When not in read-only mode, allows adding and removing blockers.
 */
export function RelatedTasks({
  taskId,
  task,
  readOnly = false,
  allTasks = [],
  issuePrefix = null,
  onTaskClick,
  onChanged,
}: RelatedTasksProps) {
  const [dependenciesByTask, setDependenciesByTask] = useState<Record<string, TaskDependencies>>({})
  const [isAddingChild, setIsAddingChild] = useState(false)
  const [isAddingBlocker, setIsAddingBlocker] = useState(false)
  const [isAddingBlocked, setIsAddingBlocked] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const { blockers, dependents } = useMemo(
    () => dependenciesByTask[taskId] ?? { blockers: [], dependents: [] },
    [dependenciesByTask, taskId],
  )

  const childTasks = useMemo(
    () => allTasks.filter((candidate) => candidate.parent === taskId),
    [allTasks, taskId],
  )
  const childTrees = useMemo(
    () => sortTaskTreeNodes(childTasks.map(toTreeNode), getTaskSortGroup(taskId, task, allTasks)),
    [allTasks, childTasks, task, taskId],
  )

  const fetchDependencies = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/tasks/${taskId}`)
      const data = (await response.json()) as {
        ok: boolean
        issue?: {
          dependencies?: Array<{
            id: string
            title: string
            status: string
            dependency_type: string
          }>
          dependents?: Array<{
            id: string
            title: string
            status: string
            dependency_type: string
          }>
        }
      }

      if (data.ok && data.issue) {
        const deps = data.issue.dependencies || []
        const blockingDeps = deps
          .filter((d) => d.dependency_type === "blocks")
          .map((d) => ({
            id: d.id,
            title: d.title,
            status: d.status as RelatedTask["status"],
            dependency_type: d.dependency_type,
          }))

        const dependentsData = data.issue.dependents || []
        const dependentsList = dependentsData
          .filter((d) => d.dependency_type === "blocks")
          .map((d) => ({
            id: d.id,
            title: d.title,
            status: d.status as RelatedTask["status"],
            dependency_type: d.dependency_type,
          }))
        setDependenciesByTask((current) => ({
          ...current,
          [taskId]: { blockers: blockingDeps, dependents: dependentsList },
        }))
      }
    } catch (err) {
      console.error("Failed to fetch task dependencies:", err)
    }
  }, [taskId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      await fetchDependencies()
      if (cancelled) return
    }

    load()

    return () => {
      cancelled = true
    }
  }, [fetchDependencies])

  /** Adds a child to the current task by setting this task as the child's parent. */
  const handleAddChild = useCallback(
    async (childId: string) => {
      if (readOnly) return

      setIsAddingChild(true)
      try {
        const response = await apiFetch(`/api/tasks/${childId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent: taskId }),
        })

        const data = (await response.json()) as { ok: boolean }
        if (data.ok) {
          onChanged?.()
        }
      } catch (err) {
        console.error("Failed to add child:", err)
      } finally {
        setIsAddingChild(false)
      }
    },
    [taskId, readOnly, onChanged],
  )

  /** Adds a blocker to the current task via API call. */
  const handleAddBlocker = useCallback(
    async (blockerId: string) => {
      if (readOnly) return

      setIsAddingBlocker(true)
      try {
        const response = await apiFetch(`/api/tasks/${taskId}/blockers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockerId }),
        })

        const data = (await response.json()) as { ok: boolean }
        if (data.ok) {
          await fetchDependencies()
        }
      } catch (err) {
        console.error("Failed to add blocker:", err)
      } finally {
        setIsAddingBlocker(false)
      }
    },
    [taskId, readOnly, fetchDependencies],
  )

  /** Adds this task as a blocker to another task. */
  const handleAddBlocked = useCallback(
    async (blockedId: string) => {
      if (readOnly) return

      setIsAddingBlocked(true)
      try {
        // Add this task as a blocker to the selected task
        const response = await apiFetch(`/api/tasks/${blockedId}/blockers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockerId: taskId }),
        })

        const data = (await response.json()) as { ok: boolean }
        if (data.ok) {
          await fetchDependencies()
        }
      } catch (err) {
        console.error("Failed to add blocked task:", err)
      } finally {
        setIsAddingBlocked(false)
      }
    },
    [taskId, readOnly, fetchDependencies],
  )

  const handleToggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  /** Removes a child relationship by clearing the child's parent. */
  const handleRemoveChild = useCallback(
    async (childId: string) => {
      if (readOnly) return

      try {
        const response = await apiFetch(`/api/tasks/${childId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent: "" }),
        })

        const data = (await response.json()) as { ok: boolean }
        if (data.ok) {
          onChanged?.()
        }
      } catch (err) {
        console.error("Failed to remove child:", err)
      }
    },
    [readOnly, onChanged],
  )

  /** Removes a blocker from the current task. */
  const handleRemoveBlocker = useCallback(
    async (blockerId: string) => {
      if (readOnly) return

      try {
        const response = await apiFetch(`/api/tasks/${taskId}/blockers/${blockerId}`, {
          method: "DELETE",
        })

        const data = (await response.json()) as { ok: boolean }
        if (data.ok) {
          await fetchDependencies()
        }
      } catch (err) {
        console.error("Failed to remove blocker:", err)
      }
    },
    [taskId, readOnly, fetchDependencies],
  )

  /** Removes this task as a blocker from a dependent task. */
  const handleRemoveDependent = useCallback(
    async (dependentId: string) => {
      if (readOnly) return

      try {
        // Remove this task as a blocker from the dependent
        const response = await apiFetch(`/api/tasks/${dependentId}/blockers/${taskId}`, {
          method: "DELETE",
        })

        const data = (await response.json()) as { ok: boolean }
        if (data.ok) {
          await fetchDependencies()
        }
      } catch (err) {
        console.error("Failed to remove dependent:", err)
      }
    },
    [taskId, readOnly, fetchDependencies],
  )

  const canEdit = !readOnly && task

  const groups = useMemo(() => {
    const result: Array<{
      key: string
      label: string
      trees: TaskTreeNode[]
      count: number
      isCollapsed: boolean
      onToggle: () => void
      onRemove?: (taskId: string) => void
    }> = []

    if (childTasks.length > 0) {
      result.push({
        key: "subtasks",
        label: "Subtasks",
        trees: childTrees,
        count: childTasks.length,
        isCollapsed: collapsedGroups["subtasks"] ?? false,
        onToggle: () => handleToggleGroup("subtasks"),
        onRemove: readOnly ? undefined : handleRemoveChild,
      })
    }

    if (blockers.length > 0) {
      result.push({
        key: "blocked-by",
        label: "Blocked by",
        trees: blockers.map(toTreeNode),
        count: blockers.length,
        isCollapsed: collapsedGroups["blocked-by"] ?? false,
        onToggle: () => handleToggleGroup("blocked-by"),
        onRemove: readOnly ? undefined : handleRemoveBlocker,
      })
    }

    if (dependents.length > 0) {
      result.push({
        key: "blocks",
        label: "Blocks",
        trees: dependents.map(toTreeNode),
        count: dependents.length,
        isCollapsed: collapsedGroups["blocks"] ?? false,
        onToggle: () => handleToggleGroup("blocks"),
        onRemove: readOnly ? undefined : handleRemoveDependent,
      })
    }

    return result
  }, [
    childTasks,
    childTrees,
    blockers,
    dependents,
    collapsedGroups,
    handleToggleGroup,
    handleRemoveChild,
    handleRemoveBlocker,
    handleRemoveDependent,
    readOnly,
  ])

  const hasContent = childTasks.length > 0 || blockers.length > 0 || dependents.length > 0
  if (!hasContent && !canEdit) {
    return null
  }

  return (
    <div className="grid gap-2">
      <Label>Related</Label>
      <div className="space-y-2">
        {groups.length > 0 && (
          <GroupedTaskList groups={groups} onTaskClick={onTaskClick} className="h-auto" />
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-1">
            <TaskRelationCombobox
              task={task}
              allTasks={allTasks}
              issuePrefix={issuePrefix}
              excludeIds={childTasks.map((c) => c.id)}
              relationType="child"
              onSelect={handleAddChild}
              disabled={isAddingChild}
            />
            <TaskRelationCombobox
              task={task}
              allTasks={allTasks}
              issuePrefix={issuePrefix}
              excludeIds={blockers.map((b) => b.id)}
              relationType="blocker"
              onSelect={handleAddBlocker}
              disabled={isAddingBlocker}
            />
            <TaskRelationCombobox
              task={task}
              allTasks={allTasks}
              issuePrefix={issuePrefix}
              excludeIds={dependents.map((d) => d.id)}
              relationType="blocked"
              onSelect={handleAddBlocked}
              disabled={isAddingBlocked}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** Convert a task or relationship summary to a leaf task tree node. */
function toTreeNode(
  /** Task data to wrap. */
  related: Task | RelatedTask,
): TaskTreeNode {
  return {
    task: related,
    children: [],
  }
}

/** Get the status group whose list ordering applies to a task's subtasks. */
function getTaskSortGroup(
  /** Selected task ID. */
  taskId: string,
  /** Selected task details, when available. */
  task: Task | undefined,
  /** Tasks available in the current list. */
  allTasks: Task[],
): TaskGroup {
  const currentTask = task ?? allTasks.find((candidate) => candidate.id === taskId)
  if (!currentTask) return "open"

  const tasks = allTasks.some((candidate) => candidate.id === currentTask.id)
    ? allTasks
    : [...allTasks, currentTask]
  const { taskMap } = buildTaskTree(tasks)
  const rootTask = findRootAncestor(currentTask, taskMap)

  if (rootTask.status !== "closed" && rootTask.status !== "deferred") return "open"
  if (currentTask.status === "closed" || currentTask.status === "deferred") {
    return currentTask.status
  }
  return "open"
}

/** Related tasks fetched for one task. */
type TaskDependencies = {
  /** Tasks that block the task. */
  blockers: RelatedTask[]
  /** Tasks blocked by the task. */
  dependents: RelatedTask[]
}

export type RelatedTasksProps = {
  taskId: string
  task?: Task
  readOnly?: boolean
  /** All tasks, used to find children and populate the blocker combobox. */
  allTasks?: Task[]
  /** Issue prefix for display (e.g. "rui"). */
  issuePrefix?: string | null
  /** Callback when a related task is clicked. */
  onTaskClick?: (id: string) => void
  /** Callback when a relationship is modified (child removed, blocker removed, etc.) */
  onChanged?: () => void
}
