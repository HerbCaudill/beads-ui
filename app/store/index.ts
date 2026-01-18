/**
 * Zustand store for React migration.
 *
 * This store mirrors the existing AppState from state.ts and provides a React-compatible
 * store with selector support for efficient re-renders.
 */
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"

import type { ViewName } from "../router.js"

// Re-export ViewName for consumers who import from store
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
 * Actions for updating state.
 */
export interface AppActions {
  setSelectedId: (id: string | null) => void
  setView: (view: ViewName) => void
  setFilters: (filters: Partial<Filters>) => void
  setBoard: (board: Partial<BoardState>) => void
  setWorkspace: (workspace: Partial<WorkspaceState>) => void
  /**
   * Batch update multiple state fields at once.
   */
  setState: (patch: StatePatch) => void
}

/**
 * Combined store type.
 */
export type AppStore = AppState & AppActions

/**
 * Default initial state.
 */
const defaultState: AppState = {
  selected_id: null,
  view: "issues",
  filters: {
    status: "all",
    search: "",
    type: "",
  },
  board: {
    closed_filter: "today",
  },
  workspace: {
    current: null,
    available: [],
  },
}

/**
 * Create the Zustand store with subscribeWithSelector middleware.
 */
export const useAppStore = create<AppStore>()(
  subscribeWithSelector(set => ({
    // Initial state
    ...defaultState,

    // Actions
    setSelectedId: id => set({ selected_id: id }),

    setView: view => set({ view }),

    setFilters: filters =>
      set(state => ({
        filters: { ...state.filters, ...filters },
      })),

    setBoard: board =>
      set(state => ({
        board: { ...state.board, ...board },
      })),

    setWorkspace: workspace =>
      set(state => ({
        workspace: {
          current: workspace.current !== undefined ? workspace.current : state.workspace.current,
          available:
            workspace.available !== undefined ? workspace.available : state.workspace.available,
        },
      })),

    setState: patch =>
      set(state => ({
        ...state,
        ...patch,
        filters: patch.filters ? { ...state.filters, ...patch.filters } : state.filters,
        board: patch.board ? { ...state.board, ...patch.board } : state.board,
        workspace:
          patch.workspace ?
            {
              current:
                patch.workspace.current !== undefined ?
                  patch.workspace.current
                : state.workspace.current,
              available:
                patch.workspace.available !== undefined ?
                  patch.workspace.available
                : state.workspace.available,
            }
          : state.workspace,
      })),
  })),
)

/**
 * Get the current state without subscribing (for use outside React).
 */
export const getAppState = (): AppState => {
  const state = useAppStore.getState()
  return {
    selected_id: state.selected_id,
    view: state.view,
    filters: state.filters,
    board: state.board,
    workspace: state.workspace,
  }
}

/**
 * Subscribe to store changes with selector support (for use outside React).
 * Returns unsubscribe function.
 */
export const subscribeAppStore = <T>(
  selector: (state: AppState) => T,
  callback: (selected: T, previousSelected: T) => void,
): (() => void) => {
  return useAppStore.subscribe(selector, callback)
}
