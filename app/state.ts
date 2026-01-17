/**
 * Minimal app state store with subscription.
 */
import { debug } from "./utils/logging.js"
import type { ViewName } from "./router.js"

// Re-export ViewName for consumers who import from state
export type { ViewName }

/**
 * Status filter for issue lists.
 */
export type StatusFilter = "all" | "open" | "in_progress" | "closed" | "ready"

/**
 * Active filters for issue lists.
 */
export interface Filters {
  status: StatusFilter
  search: string
  type: string
}

/**
 * Closed filter for board view.
 */
export type ClosedFilter = "today" | "3" | "7"

/**
 * Board-specific state.
 */
export interface BoardState {
  closed_filter: ClosedFilter
}

/**
 * Information about a workspace.
 */
export interface WorkspaceInfo {
  /** Full path to workspace */
  path: string
  /** Path to the database file */
  database: string
  /** Process ID of the daemon */
  pid?: number
  /** Version of beads */
  version?: string
}

/**
 * Workspace state.
 */
export interface WorkspaceState {
  /** Currently active workspace */
  current: WorkspaceInfo | null
  /** All available workspaces */
  available: WorkspaceInfo[]
}

/**
 * Application state.
 */
export interface AppState {
  selected_id: string | null
  view: ViewName
  filters: Filters
  board: BoardState
  workspace: WorkspaceState
}

/**
 * Patch type for setState, allowing partial updates.
 */
export interface StatePatch {
  selected_id?: string | null
  view?: ViewName
  filters?: Partial<Filters>
  board?: Partial<BoardState>
  workspace?: Partial<WorkspaceState>
}

/**
 * Store interface returned by createStore.
 */
export interface Store {
  getState: () => AppState
  setState: (patch: StatePatch) => void
  subscribe: (fn: (s: AppState) => void) => () => void
}

/**
 * Create a simple store for application state.
 */
export function createStore(initial: Partial<AppState> = {}): Store {
  const log = debug("state")

  let state: AppState = {
    selected_id: initial.selected_id ?? null,
    view: initial.view ?? "issues",
    filters: {
      status: initial.filters?.status ?? "all",
      search: initial.filters?.search ?? "",
      type: typeof initial.filters?.type === "string" ? initial.filters?.type : "",
    },
    board: {
      closed_filter:
        (
          initial.board?.closed_filter === "3" ||
          initial.board?.closed_filter === "7" ||
          initial.board?.closed_filter === "today"
        ) ?
          initial.board?.closed_filter
        : "today",
    },
    workspace: {
      current: initial.workspace?.current ?? null,
      available: initial.workspace?.available ?? [],
    },
  }

  const subs = new Set<(s: AppState) => void>()

  function emit(): void {
    for (const fn of Array.from(subs)) {
      try {
        fn(state)
      } catch {
        // ignore
      }
    }
  }

  return {
    getState() {
      return state
    },
    /**
     * Update state. Nested filters can be partial.
     */
    setState(patch: StatePatch) {
      const next: AppState = {
        ...state,
        ...patch,
        filters: { ...state.filters, ...(patch.filters ?? {}) },
        board: { ...state.board, ...(patch.board ?? {}) },
        workspace: {
          current:
            patch.workspace?.current !== undefined ?
              patch.workspace.current
            : state.workspace.current,
          available:
            patch.workspace?.available !== undefined ?
              patch.workspace.available
            : state.workspace.available,
        },
      }
      // Avoid emitting if nothing changed (shallow compare)
      const workspace_changed =
        next.workspace.current?.path !== state.workspace.current?.path ||
        next.workspace.available.length !== state.workspace.available.length
      if (
        next.selected_id === state.selected_id &&
        next.view === state.view &&
        next.filters.status === state.filters.status &&
        next.filters.search === state.filters.search &&
        next.filters.type === state.filters.type &&
        next.board.closed_filter === state.board.closed_filter &&
        !workspace_changed
      ) {
        return
      }
      state = next
      log("state change %o", {
        selected_id: state.selected_id,
        view: state.view,
        filters: state.filters,
        board: state.board,
        workspace: state.workspace.current?.path,
      })
      emit()
    },
    subscribe(fn: (s: AppState) => void) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}
