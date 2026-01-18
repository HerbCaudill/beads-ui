/**
 * React App shell component.
 *
 * This component uses portals to render React components into existing DOM
 * sections created by the Lit-based UI. This allows for incremental migration
 * where both frameworks coexist during the transition.
 *
 * Portal targets:
 * - #epics-root - Epics view (will be migrated first)
 * - #board-root - Board view
 * - #issues-root - Issues list view
 * - #detail-panel - Issue detail view
 */
import { useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { useAppStore, type ViewName } from "../store/index.js"

/**
 * Configuration for which views are rendered by React vs Lit.
 *
 * Set a view to true to render it with React, false to let Lit handle it.
 * This allows incremental migration one view at a time.
 */
const REACT_VIEWS: Record<ViewName, boolean> = {
  issues: false,
  epics: false,
  board: false,
}

/**
 * Hook to subscribe to Zustand store for the current view.
 *
 * @returns The current view name.
 */
function useCurrentView(): ViewName {
  return useSyncExternalStore(
    callback => useAppStore.subscribe(callback),
    () => useAppStore.getState().view,
    () => useAppStore.getState().view,
  )
}

/**
 * Portal wrapper for a view component.
 *
 * Renders the component into the specified DOM container using React portal.
 * Returns null if the container doesn't exist.
 *
 * @param props - Props including container ID, component, and visibility.
 * @param props.container_id - The DOM element ID to portal into.
 * @param props.children - The React elements to render.
 * @param props.visible - Whether the portal content should be visible.
 */
function ViewPortal({
  container_id,
  children,
  visible,
}: {
  container_id: string
  children: React.ReactNode
  visible: boolean
}): React.ReactPortal | null {
  const container = document.getElementById(container_id)
  if (!container) {
    return null
  }

  // Only render content when visible to avoid unnecessary work
  if (!visible) {
    return null
  }

  return createPortal(children, container)
}

/**
 * React App shell component.
 *
 * Renders React views into existing DOM containers via portals.
 * Views that haven't been migrated yet are rendered by Lit.
 */
export function App(): React.JSX.Element {
  const view = useCurrentView()

  return (
    <>
      {/* Epics view portal */}
      {REACT_VIEWS.epics && (
        <ViewPortal container_id="epics-root" visible={view === "epics"}>
          {/* EpicsView will be added here when migrated */}
          <div data-testid="react-epics-placeholder">Epics view (React)</div>
        </ViewPortal>
      )}

      {/* Board view portal */}
      {REACT_VIEWS.board && (
        <ViewPortal container_id="board-root" visible={view === "board"}>
          {/* BoardView will be added here when migrated */}
          <div data-testid="react-board-placeholder">Board view (React)</div>
        </ViewPortal>
      )}

      {/* Issues list view portal */}
      {REACT_VIEWS.issues && (
        <ViewPortal container_id="issues-root" visible={view === "issues"}>
          {/* ListView will be added here when migrated */}
          <div data-testid="react-issues-placeholder">Issues view (React)</div>
        </ViewPortal>
      )}
    </>
  )
}
