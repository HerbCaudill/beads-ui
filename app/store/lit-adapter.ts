/**
 * Lit-html store adapter for backwards compatibility.
 *
 * This adapter wraps the Zustand store and implements the legacy Store interface
 * used by lit-html views, enabling incremental migration to React.
 */
import type { Store, AppState, StatePatch } from "../state.js"
import { useAppStore } from "./index.js"

/**
 * Create a Store adapter that wraps the Zustand store.
 *
 * This allows lit-html views to continue using the familiar Store interface
 * while the underlying state is managed by Zustand. React components can
 * use useAppStore directly for optimal re-renders.
 */
export function createLitStoreAdapter(): Store {
  return {
    getState(): AppState {
      const state = useAppStore.getState()
      return {
        selected_id: state.selected_id,
        view: state.view,
        filters: state.filters,
        board: state.board,
        workspace: state.workspace,
      }
    },

    setState(patch: StatePatch): void {
      useAppStore.getState().setState(patch)
    },

    subscribe(fn: (s: AppState) => void): () => void {
      // Subscribe to full state changes
      return useAppStore.subscribe(
        state => ({
          selected_id: state.selected_id,
          view: state.view,
          filters: state.filters,
          board: state.board,
          workspace: state.workspace,
        }),
        (selected, _previous) => {
          fn(selected)
        },
        { equalityFn: shallowEqual },
      )
    },
  }
}

/**
 * Shallow equality comparison for state objects.
 */
function shallowEqual(a: AppState, b: AppState): boolean {
  if (a === b) return true

  // Compare top-level primitives
  if (a.selected_id !== b.selected_id) return false
  if (a.view !== b.view) return false

  // Compare filters
  if (
    a.filters.status !== b.filters.status ||
    a.filters.search !== b.filters.search ||
    a.filters.type !== b.filters.type
  ) {
    return false
  }

  // Compare board
  if (a.board.closed_filter !== b.board.closed_filter) return false

  // Compare workspace
  if (a.workspace.current?.path !== b.workspace.current?.path) return false
  if (a.workspace.available.length !== b.workspace.available.length) return false

  return true
}
