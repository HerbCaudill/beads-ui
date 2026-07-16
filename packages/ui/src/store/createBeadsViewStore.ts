import { createJSONStorage, persist } from "zustand/middleware"
import { createStore } from "zustand/vanilla"

import { apiFetch } from "../lib/apiClient"
import type { Comment, Task, TaskGroup } from "../types"
import type { BeadsViewStore } from "./types"

/** Default collapsed state for status groups. */
const DEFAULT_STATUS_COLLAPSED_STATE: Record<TaskGroup, boolean> = {
  open: false,
  deferred: true,
  closed: true,
}

/** Debounce window for task refresh requests. */
const TASK_REFRESH_DEBOUNCE_MS = 50

/** Maximum number of comment drafts to keep. */
const MAX_COMMENT_DRAFTS = 50

/** Persist version for the fixed-workspace store. */
const PERSIST_VERSION = 5

/** Create a fixed-workspace Beads View store instance. */
export function createBeadsViewStore(
  /** Optional initial state overrides. */
  initialState: Partial<BeadsViewStore> = {},
) {
  let taskRefreshPending = false
  let taskRefreshDebounceTimeout: ReturnType<typeof setTimeout> | null = null

  return createStore<BeadsViewStore>()(
    persist(
      (set, get) => ({
        issuePrefix: null,
        accentColor: null,
        initialTaskCount: null,
        tasks: [],
        taskSearchQuery: "",
        selectedTaskId: null,
        visibleTaskIds: [],
        closedTimeFilter: "past_day",
        statusCollapsedState: DEFAULT_STATUS_COLLAPSED_STATE,
        parentCollapsedState: {},
        taskInputDraft: "",
        commentDrafts: {},
        commentCacheByTask: {},
        setIssuePrefix: (prefix) => set({ issuePrefix: prefix }),
        setAccentColor: (color) => set({ accentColor: color }),
        setTasks: (tasks) => set({ tasks }),
        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
          })),
        removeTask: (id) =>
          set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
        clearTasks: () => set({ tasks: [] }),
        refreshTasks: () => {
          taskRefreshPending = true
          if (taskRefreshDebounceTimeout !== null) return

          taskRefreshDebounceTimeout = setTimeout(async () => {
            taskRefreshDebounceTimeout = null
            if (!taskRefreshPending) return
            taskRefreshPending = false

            try {
              const response = await apiFetch("/api/tasks?all=true")
              const data = (await response.json()) as { ok: boolean; issues?: Task[] }
              if (data.ok && data.issues) set({ tasks: data.issues })
            } catch (cause) {
              console.error("Failed to refresh tasks:", cause)
            }
          }, TASK_REFRESH_DEBOUNCE_MS)
        },
        setTaskSearchQuery: (query) => set({ taskSearchQuery: query }),
        clearTaskSearchQuery: () => set({ taskSearchQuery: "" }),
        setSelectedTaskId: (id) => set({ selectedTaskId: id }),
        clearSelectedTaskId: () => set({ selectedTaskId: null }),
        setVisibleTaskIds: (ids) => {
          const current = get().visibleTaskIds
          if (current.length === ids.length && current.every((id, index) => id === ids[index]))
            return
          set({ visibleTaskIds: ids })
        },
        setClosedTimeFilter: (filter) => set({ closedTimeFilter: filter }),
        setStatusCollapsedState: (state) => set({ statusCollapsedState: state }),
        toggleStatusGroup: (group) =>
          set((state) => ({
            statusCollapsedState: {
              ...state.statusCollapsedState,
              [group]: !state.statusCollapsedState[group],
            },
          })),
        setParentCollapsedState: (state) => set({ parentCollapsedState: state }),
        toggleParentGroup: (parentId) =>
          set((state) => ({
            parentCollapsedState: {
              ...state.parentCollapsedState,
              [parentId]: !state.parentCollapsedState[parentId],
            },
          })),
        setTaskInputDraft: (draft) => set({ taskInputDraft: draft }),
        setInitialTaskCount: (count) => set({ initialTaskCount: count }),
        setCommentDraft: (taskId, draft) =>
          set((state) => {
            if (!draft) {
              const { [taskId]: _, ...commentDrafts } = state.commentDrafts
              return { commentDrafts }
            }

            const commentDrafts = { ...state.commentDrafts, [taskId]: draft }
            const excess = Object.keys(commentDrafts).length - MAX_COMMENT_DRAFTS
            Object.keys(commentDrafts)
              .slice(0, Math.max(0, excess))
              .forEach((key) => delete commentDrafts[key])
            return { commentDrafts }
          }),
        clearCommentDraft: (taskId) =>
          set((state) => {
            const { [taskId]: _, ...commentDrafts } = state.commentDrafts
            return { commentDrafts }
          }),
        getCachedCommentsForTask: (taskId) => get().commentCacheByTask[taskId] ?? [],
        setCachedCommentsForTask: (taskId, comments) =>
          set((state) => ({
            commentCacheByTask: { ...state.commentCacheByTask, [taskId]: comments },
          })),
        ...initialState,
      }),
      {
        name: "beads-view-store",
        version: PERSIST_VERSION,
        storage: createJSONStorage(() => localStorage),
        migrate: (persistedState) => {
          const state = persistedState as Partial<BeadsViewStore> | undefined
          if (!state) return persistedState
          const legacy = state as Partial<BeadsViewStore> & {
            commentCacheByWorkspaceTask?: unknown
            taskCacheByWorkspace?: unknown
          }
          const { commentCacheByWorkspaceTask: _, taskCacheByWorkspace: __, ...fixedState } = legacy
          return fixedState
        },
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...(persistedState as Partial<BeadsViewStore>),
          tasks: [],
          selectedTaskId: null,
          visibleTaskIds: [],
          initialTaskCount: null,
          commentCacheByTask: {},
        }),
        partialize: (state) => ({
          issuePrefix: state.issuePrefix,
          accentColor: state.accentColor,
          taskSearchQuery: state.taskSearchQuery,
          closedTimeFilter: state.closedTimeFilter,
          statusCollapsedState: state.statusCollapsedState,
          parentCollapsedState: state.parentCollapsedState,
          taskInputDraft: state.taskInputDraft,
          commentDrafts: state.commentDrafts,
        }),
      },
    ),
  )
}
