import {
  IconCircleCheck,
  IconClock,
  IconListCheck,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { addComment } from "./add-comment.js"
import { addDependency } from "./add-dependency.js"
import { addLabel } from "./add-label.js"
import { createIssue } from "./create-issue.js"
import { deleteIssue } from "./delete-issue.js"
import { filterIssues } from "./filter-issues.js"
import { getIssue } from "./get-issue.js"
import { getStatus } from "./get-status.js"
import { getWorkspace } from "./get-workspace.js"
import { listIssues } from "./list-issues.js"
import { removeDependency } from "./remove-dependency.js"
import { removeLabel } from "./remove-label.js"
import { TaskDetail } from "./TaskDetail.js"
import { TaskForm } from "./TaskForm.js"
import { TaskList } from "./TaskList.js"
import type {
  Issue,
  IssueDetail,
  IssueStatus,
  StatusSummary,
  TaskDraft,
  Workspace,
} from "./types.js"
import { updateIssue } from "./update-issue.js"
import { useAppHotkeys } from "./use-app-hotkeys.js"
import { useWorkspaceEvents } from "./use-workspace-events.js"

/** Render the task manager for the server-configured workspace. */
export function App(_props: Props) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [status, setStatus] = useState<StatusSummary | null>(null)
  const [issues, setIssues] = useState<readonly Issue[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<IssueDetail | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all")
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const filteredIssues = useMemo(
    () => filterIssues(issues, search, statusFilter),
    [issues, search, statusFilter],
  )

  const refreshTaskData = useCallback(() => {
    void Promise.all([getStatus(), listIssues()])
      .then(([nextStatus, nextIssues]) => {
        setStatus(nextStatus)
        setIssues(nextIssues)
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to refresh tasks"),
      )
    if (selectedId) {
      void getIssue(selectedId)
        .then(setSelectedIssue)
        .catch((cause: unknown) =>
          setError(cause instanceof Error ? cause.message : "Unable to refresh task"),
        )
    }
  }, [selectedId])

  useWorkspaceEvents(refreshTaskData)

  /** Select and load one task. */
  const selectIssue = (issueId: string) => {
    setSelectedId(issueId)
    void getIssue(issueId)
      .then(setSelectedIssue)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to load task"),
      )
  }

  /** Persist a newly created task. */
  const submitNewTask = (draft: TaskDraft) => {
    void createIssue(draft)
      .then((created) => {
        setIssues((current) => [created, ...current])
        setCreating(false)
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to create task"),
      )
  }

  /** Persist edits to the selected task. */
  const submitTaskEdit = (draft: TaskDraft) => {
    if (!selectedIssue) return
    void updateIssue(selectedIssue.id, draft)
      .then((updated) => {
        setIssues((current) => current.map((issue) => (issue.id === updated.id ? updated : issue)))
        setSelectedIssue((current) => (current ? { ...current, ...updated } : null))
        setEditing(false)
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to update task"),
      )
  }

  /** Confirm and delete the selected task. */
  const removeSelectedTask = () => {
    if (!selectedIssue || !window.confirm(`Delete ${selectedIssue.id}?`)) return
    void deleteIssue(selectedIssue.id)
      .then(() => {
        setIssues((current) => current.filter((issue) => issue.id !== selectedIssue.id))
        setSelectedId(null)
        setSelectedIssue(null)
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to delete task"),
      )
  }

  /** Reload the selected task after a related-data mutation. */
  const refreshSelectedIssue = () => {
    if (!selectedId) return
    void getIssue(selectedId)
      .then((next) => {
        setSelectedIssue(next)
        setIssues((current) => current.map((issue) => (issue.id === next.id ? next : issue)))
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to refresh task"),
      )
  }

  /** Add a comment to the selected task. */
  const addSelectedComment = (text: string) => {
    if (!selectedIssue) return
    void addComment(selectedIssue.id, text)
      .then((comment) =>
        setSelectedIssue((current) =>
          current ? { ...current, comments: [...current.comments, comment] } : null,
        ),
      )
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to add comment"),
      )
  }

  /** Add a blocking dependency to the selected task. */
  const addSelectedDependency = (dependsOnId: string) => {
    if (!selectedIssue) return
    void addDependency(selectedIssue.id, dependsOnId)
      .then(refreshSelectedIssue)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to add dependency"),
      )
  }

  /** Remove a blocking dependency from the selected task. */
  const removeSelectedDependency = (dependsOnId: string) => {
    if (!selectedIssue) return
    void removeDependency(selectedIssue.id, dependsOnId)
      .then(refreshSelectedIssue)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to remove dependency"),
      )
  }

  /** Attach a label to the selected task. */
  const addSelectedLabel = (label: string) => {
    if (!selectedIssue) return
    void addLabel(selectedIssue.id, label)
      .then(refreshSelectedIssue)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to add label"),
      )
  }

  /** Remove a label from the selected task. */
  const removeSelectedLabel = (label: string) => {
    if (!selectedIssue) return
    void removeLabel(selectedIssue.id, label)
      .then(refreshSelectedIssue)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to remove label"),
      )
  }

  /** Move keyboard selection through the filtered task list. */
  const moveSelection = (direction: -1 | 1) => {
    if (!filteredIssues.length) return
    const currentIndex = filteredIssues.findIndex((issue) => issue.id === selectedId)
    const nextIndex =
      currentIndex < 0
        ? direction > 0
          ? 0
          : filteredIssues.length - 1
        : (currentIndex + direction + filteredIssues.length) % filteredIssues.length
    const nextIssue = filteredIssues[nextIndex]
    if (nextIssue) selectIssue(nextIssue.id)
  }

  useAppHotkeys(
    searchInput,
    () => setCreating(true),
    moveSelection,
    () => {
      setCreating(false)
      setEditing(false)
    },
  )

  useEffect(() => {
    let active = true
    void Promise.all([getWorkspace(), getStatus(), listIssues()])
      .then(([nextWorkspace, nextStatus, nextIssues]) => {
        if (!active) return
        setWorkspace(nextWorkspace)
        setStatus(nextStatus)
        setIssues(nextIssues)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : "Unable to load tasks")
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {workspace?.name ?? "Beads UI"}
            </h1>
            <p className="truncate text-sm text-slate-400">
              {workspace?.path ?? "Loading workspace…"}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            onClick={() => setCreating(true)}
            type="button"
          >
            <IconPlus size={18} />
            New task
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {error ? (
          <div className="mb-5 rounded-lg border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section aria-label="Task summary" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <IconListCheck className="mb-3 text-cyan-400" size={20} />
            <strong className="block text-2xl">{status?.ready ?? 0}</strong>
            <span className="text-sm text-slate-400">{status?.ready ?? 0} ready</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <IconClock className="mb-3 text-amber-400" size={20} />
            <strong className="block text-2xl">{status?.inProgress ?? 0}</strong>
            <span className="text-sm text-slate-400">In progress</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <IconCircleCheck className="mb-3 text-emerald-400" size={20} />
            <strong className="block text-2xl">{status?.closed ?? 0}</strong>
            <span className="text-sm text-slate-400">Closed</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <span className="mb-3 block text-sm font-semibold text-slate-500">Total</span>
            <strong className="block text-2xl">{status?.total ?? 0}</strong>
            <span className="text-sm text-slate-400">All tasks</span>
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.75fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex gap-3 border-b border-slate-800 p-4">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search tasks</span>
                <IconSearch className="absolute left-3 top-2.5 text-slate-500" size={18} />
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tasks"
                  ref={searchInput}
                  value={search}
                />
              </label>
              <label>
                <span className="sr-only">Filter by status</span>
                <select
                  className="h-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 outline-none focus:border-cyan-500"
                  onChange={(event) => setStatusFilter(event.target.value as IssueStatus | "all")}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="deferred">Deferred</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
            <TaskList issues={filteredIssues} onSelect={selectIssue} selectedId={selectedId} />
          </section>
          {selectedIssue ? (
            <TaskDetail
              issue={selectedIssue}
              onAddComment={addSelectedComment}
              onAddDependency={addSelectedDependency}
              onAddLabel={addSelectedLabel}
              onDelete={removeSelectedTask}
              onEdit={() => setEditing(true)}
              onRemoveDependency={removeSelectedDependency}
              onRemoveLabel={removeSelectedLabel}
            />
          ) : null}
        </div>
      </div>
      {creating ? <TaskForm onCancel={() => setCreating(false)} onSubmit={submitNewTask} /> : null}
      {editing && selectedIssue ? (
        <TaskForm
          initial={selectedIssue}
          onCancel={() => setEditing(false)}
          onSubmit={submitTaskEdit}
        />
      ) : null}
    </main>
  )
}

/** App has no caller-provided configuration because the server fixes the workspace. */
type Props = Record<string, never>
