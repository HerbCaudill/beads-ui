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
 * - #detail-panel - Issue detail view (dialog)
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

import { useAppStore, type ViewName } from "../store/index.js"
import { issueHashFor } from "../utils/issue-url.js"
import { BoardView } from "./BoardView.js"
import { DetailView } from "./DetailView.js"
import { EpicsView } from "./EpicsView.js"
import { IssueDialog } from "./IssueDialog.js"
import { ListView } from "./ListView.js"
import { NewIssueDialog } from "./NewIssueDialog.js"

/**
 * Configuration for which views are rendered by React vs Lit.
 *
 * Set a view to true to render it with React, false to let Lit handle it.
 * This allows incremental migration one view at a time.
 */
const REACT_VIEWS: Record<ViewName, boolean> = {
  issues: true, // Migrated to React
  epics: true, // Migrated to React
  board: true, // Migrated to React
}

/**
 * Whether to render the detail view with React.
 * Set to true once the React DetailView is ready to replace the Lit version.
 */
const REACT_DETAIL = true

/**
 * Whether to render the new issue dialog with React.
 */
const REACT_NEW_ISSUE_DIALOG = true

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
 * Hook to subscribe to Zustand store for the selected issue ID.
 *
 * @returns The currently selected issue ID, or null if none selected.
 */
function useSelectedId(): string | null {
  return useSyncExternalStore(
    callback => useAppStore.subscribe(callback),
    () => useAppStore.getState().selected_id,
    () => useAppStore.getState().selected_id,
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
  const selectedId = useSelectedId()
  const [newIssueDialogOpen, setNewIssueDialogOpen] = useState(false)

  /**
   * Open the new issue dialog.
   */
  const openNewIssueDialog = useCallback((): void => {
    setNewIssueDialogOpen(true)
  }, [])

  /**
   * Close the new issue dialog.
   */
  const closeNewIssueDialog = useCallback((): void => {
    setNewIssueDialogOpen(false)
  }, [])

  /**
   * Handle new issue created - navigate to the new issue.
   */
  const handleNewIssueCreated = useCallback((id: string): void => {
    const current_view = useAppStore.getState().view
    const hash = issueHashFor(current_view, id)
    window.location.hash = hash
    // Also set the selected_id to open the detail dialog
    useAppStore.getState().setSelectedId(id)
  }, [])

  // Listen for new issue button click and keyboard shortcut
  useEffect(() => {
    if (!REACT_NEW_ISSUE_DIALOG) return

    // Button click handler
    const btn = document.getElementById("new-issue-btn")
    const handleClick = (): void => {
      openNewIssueDialog()
    }
    btn?.addEventListener("click", handleClick)

    // Keyboard shortcut handler ("n" key)
    const handleKeydown = (ev: KeyboardEvent): void => {
      // Ignore if typing in an input or dialog is already open
      const target = ev.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase() || ""
      const isEditable =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable === true
      const dialogOpen = document.querySelector("dialog[open]") !== null

      if (
        ev.key === "n" &&
        !ev.ctrlKey &&
        !ev.metaKey &&
        !ev.altKey &&
        !isEditable &&
        !dialogOpen
      ) {
        ev.preventDefault()
        openNewIssueDialog()
      }
    }
    document.addEventListener("keydown", handleKeydown)

    return () => {
      btn?.removeEventListener("click", handleClick)
      document.removeEventListener("keydown", handleKeydown)
    }
  }, [openNewIssueDialog])

  /**
   * Navigate to an issue by updating the URL hash.
   */
  const handleNavigate = useCallback((id: string): void => {
    const current_view = useAppStore.getState().view
    const hash = issueHashFor(current_view, id)
    window.location.hash = hash
  }, [])

  /**
   * Handle detail dialog close.
   * Clears the selected_id and navigates back to the current view.
   */
  const handleDialogClose = useCallback((): void => {
    const current_view = useAppStore.getState().view
    useAppStore.getState().setSelectedId(null)
    // Navigate to current view (this clears the issue from URL)
    window.location.hash = `#/${current_view}`
  }, [])

  /**
   * Handle navigation from within the detail view.
   * Supports both navigating to another issue and closing the dialog.
   */
  const handleDetailNavigate = useCallback(
    (target: string): void => {
      // If target starts with #/ and has no issue param, it's a close action
      if (target.startsWith("#/") && !target.includes("?issue=")) {
        const viewMatch = target.match(/^#\/(\w+)/)
        if (viewMatch) {
          const targetView = viewMatch[1] as ViewName
          useAppStore.getState().setSelectedId(null)
          useAppStore.getState().setView(targetView)
          window.location.hash = `#/${targetView}`
          return
        }
      }
      // Otherwise, navigate to the issue
      handleNavigate(target)
    },
    [handleNavigate],
  )

  return (
    <>
      {/* Epics view portal */}
      {REACT_VIEWS.epics && (
        <ViewPortal container_id="epics-root" visible={view === "epics"}>
          <EpicsView onNavigate={handleNavigate} />
        </ViewPortal>
      )}

      {/* Board view portal */}
      {REACT_VIEWS.board && (
        <ViewPortal container_id="board-root" visible={view === "board"}>
          <BoardView onNavigate={handleNavigate} />
        </ViewPortal>
      )}

      {/* Issues list view portal */}
      {REACT_VIEWS.issues && (
        <ViewPortal container_id="issues-root" visible={view === "issues"}>
          <ListView onNavigate={handleNavigate} />
        </ViewPortal>
      )}

      {/* Issue detail dialog - rendered via portal to detail-panel */}
      {REACT_DETAIL && (
        <DetailPortal selectedId={selectedId}>
          <IssueDialog
            isOpen={selectedId !== null}
            issueId={selectedId}
            onClose={handleDialogClose}
            testId="issue-dialog"
          >
            {selectedId && (
              <DetailView
                issueId={selectedId}
                onNavigate={handleDetailNavigate}
                testId="detail-view"
              />
            )}
          </IssueDialog>
        </DetailPortal>
      )}

      {/* New issue dialog - rendered directly, not via portal */}
      {REACT_NEW_ISSUE_DIALOG && (
        <NewIssueDialog
          isOpen={newIssueDialogOpen}
          onClose={closeNewIssueDialog}
          onCreated={handleNewIssueCreated}
          testId="new-issue-dialog"
        />
      )}
    </>
  )
}

/**
 * Portal for the detail view dialog.
 *
 * Renders into #detail-panel when an issue is selected.
 * The portal container visibility is managed by main-lit.ts.
 *
 * @param props - Props including children and selected issue ID.
 */
function DetailPortal({
  children,
  selectedId,
}: {
  children: React.ReactNode
  selectedId: string | null
}): React.ReactPortal | null {
  const container = document.getElementById("detail-panel")
  if (!container) {
    return null
  }

  // Always render the portal when selectedId exists
  // The IssueDialog handles open/close state
  if (!selectedId) {
    return null
  }

  return createPortal(children, container)
}
