import { beforeEach, describe, expect, it, vi } from "vitest"
import { configureApiClient } from "../../lib/apiClient"
import { createBeadsViewStore } from "../createBeadsViewStore"
import type { Task } from "../../types"

const STORAGE_KEY = "beads-view-store"
const WORKSPACE_STORAGE_KEY = "ralph-workspace-path"

const TASK_A: Task = {
  id: "a-1",
  title: "Workspace A task",
  status: "open",
}

const TASK_B: Task = {
  id: "b-1",
  title: "Workspace B task",
  status: "open",
}

describe("createBeadsViewStore", () => {
  beforeEach(() => {
    localStorage.clear()
    configureApiClient({})
    vi.useRealTimers()
  })

  it("migrates legacy v0 state, restoring tasks from the tasks array", async () => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, "workspace/a")
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          issuePrefix: null,
          accentColor: null,
          tasks: [TASK_A],
          taskSearchQuery: "",
          selectedTaskId: null,
          closedTimeFilter: "past_day",
          statusCollapsedState: { open: false, deferred: true, closed: true },
          parentCollapsedState: {},
          taskInputDraft: "",
          commentDrafts: {},
        },
        version: 0,
      }),
    )

    const store = createBeadsViewStore()
    expect(store.getState().tasks).toEqual([TASK_A])
  })

  it("migrates v2 state with workspace cache, preserving current workspace tasks", () => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, "workspace/a")
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          issuePrefix: null,
          accentColor: null,
          tasks: [TASK_A],
          taskCacheByWorkspace: {
            "workspace/a": [TASK_A],
            "workspace/b": [TASK_B],
          },
          commentCacheByWorkspaceTask: {
            "workspace/a::task-1": [{ id: 1, text: "comment" }],
          },
          taskSearchQuery: "",
          selectedTaskId: null,
          closedTimeFilter: "past_day",
          statusCollapsedState: { open: false, deferred: true, closed: true },
          parentCollapsedState: {},
          taskInputDraft: "",
          commentDrafts: {},
        },
        version: 2,
      }),
    )

    const store = createBeadsViewStore()
    // Current workspace tasks are preserved
    expect(store.getState().tasks).toEqual([TASK_A])

    // Large caches are no longer persisted
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      state?: { taskCacheByWorkspace?: unknown; commentCacheByWorkspaceTask?: unknown }
    }
    expect(persisted.state?.taskCacheByWorkspace).toBeUndefined()
    expect(persisted.state?.commentCacheByWorkspaceTask).toBeUndefined()
  })

  it("writes refresh results into the fixed workspace task list", async () => {
    vi.useFakeTimers()
    localStorage.setItem(WORKSPACE_STORAGE_KEY, "workspace/a")
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, issues: [TASK_A] }),
    })
    global.fetch = fetchMock as typeof fetch

    const store = createBeadsViewStore()
    store.getState().refreshTasks()

    await vi.advanceTimersByTimeAsync(100)

    expect(store.getState().tasks).toEqual([TASK_A])
  })

  it("keeps one comment cache per task regardless of legacy workspace arguments", () => {
    const store = createBeadsViewStore()
    const commentsA = [
      {
        id: 1,
        issue_id: "task-123",
        author: "a",
        text: "workspace a comment",
        created_at: "2026-02-11T00:00:00Z",
      },
    ]
    const commentsB = [
      {
        id: 2,
        issue_id: "task-123",
        author: "b",
        text: "workspace b comment",
        created_at: "2026-02-11T00:00:01Z",
      },
    ]

    store.getState().setCachedCommentsForTask("task-123", commentsA, "workspace/a")
    store.getState().setCachedCommentsForTask("task-123", commentsB, "workspace/b")

    expect(store.getState().getCachedCommentsForTask("task-123", "workspace/a")).toEqual(commentsB)
    expect(store.getState().getCachedCommentsForTask("task-123", "workspace/b")).toEqual(commentsB)

    // Comments should NOT be persisted to localStorage
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      state?: { commentCacheByWorkspaceTask?: unknown }
    }
    expect(persisted.state?.commentCacheByWorkspaceTask).toBeUndefined()
  })
})
