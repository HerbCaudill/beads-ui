/**
 * React Nav component.
 *
 * Renders the top navigation tabs (Issues, Epics, Board) and handles view switching.
 * This is a React port of app/views/nav.ts.
 */
import { useCallback } from "react"

import { useAppStore, type ViewName } from "../store/index.js"

/**
 * Hook to subscribe to Zustand store for the current view.
 *
 * @returns The current view name.
 */
function useCurrentView(): ViewName {
  return useAppStore(state => state.view)
}

/**
 * Props for the Nav component.
 */
export interface NavProps {
  /**
   * Optional test ID for testing.
   */
  testId?: string
}

/**
 * Top navigation component with tabs for Issues, Epics, and Board views.
 *
 * @param props - Component props.
 */
export function Nav({ testId }: NavProps): React.JSX.Element {
  const view = useCurrentView()

  /**
   * Handle tab click to navigate to a view.
   *
   * @param targetView - The view to navigate to.
   */
  const handleClick = useCallback(
    (targetView: ViewName) =>
      (ev: React.MouseEvent<HTMLAnchorElement>): void => {
        ev.preventDefault()
        // Update the hash to trigger navigation
        window.location.hash = `#/${targetView}`
      },
    [],
  )

  return (
    <nav className="header-nav" aria-label="Primary" data-testid={testId}>
      <a
        href="#/issues"
        className={`tab ${view === "issues" ? "active" : ""}`}
        onClick={handleClick("issues")}
        data-testid={testId ? `${testId}-issues` : undefined}
      >
        Issues
      </a>
      <a
        href="#/epics"
        className={`tab ${view === "epics" ? "active" : ""}`}
        onClick={handleClick("epics")}
        data-testid={testId ? `${testId}-epics` : undefined}
      >
        Epics
      </a>
      <a
        href="#/board"
        className={`tab ${view === "board" ? "active" : ""}`}
        onClick={handleClick("board")}
        data-testid={testId ? `${testId}-board` : undefined}
      >
        Board
      </a>
    </nav>
  )
}
