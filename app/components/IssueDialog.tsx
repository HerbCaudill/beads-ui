/**
 * IssueDialog component - React wrapper for the issue detail modal.
 *
 * This component provides the modal dialog functionality for displaying
 * issue details. It manages:
 * - Opening/closing the native <dialog> element
 * - Backdrop click to close
 * - Escape key handling
 * - Focus management
 * - Issue ID display in header with copy functionality
 */
import { useCallback, useEffect, useRef } from "react"

import { IssueIdRenderer } from "./IssueIdRenderer.js"

/**
 * Props for the IssueDialog component.
 */
export interface IssueDialogProps {
  /** Whether the dialog is open. */
  isOpen: boolean
  /** The issue ID to display in the header. */
  issueId: string | null
  /** Handler called when the dialog should close. */
  onClose: () => void
  /** Children to render in the dialog body. */
  children: React.ReactNode
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * IssueDialog component.
 *
 * Renders a modal dialog for issue details using the native <dialog> element.
 * The dialog opens when isOpen is true and the issueId is provided.
 *
 * @param props - Component props.
 */
export function IssueDialog({
  isOpen,
  issueId,
  onClose,
  children,
  testId,
}: IssueDialogProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)

  /**
   * Restore focus to the element that had focus before opening.
   */
  const restoreFocus = useCallback((): void => {
    try {
      if (lastFocusRef.current && document.contains(lastFocusRef.current)) {
        lastFocusRef.current.focus()
      }
    } catch {
      // Ignore focus errors
    } finally {
      lastFocusRef.current = null
    }
  }, [])

  /**
   * Handle close request from backdrop click, escape key, or close button.
   */
  const handleClose = useCallback((): void => {
    try {
      dialogRef.current?.close()
    } catch {
      dialogRef.current?.removeAttribute("open")
    }
    restoreFocus()
    onClose()
  }, [onClose, restoreFocus])

  // Open/close dialog based on isOpen prop
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && issueId) {
      // Capture focused element before opening
      try {
        const ae = document.activeElement
        if (ae instanceof HTMLElement) {
          lastFocusRef.current = ae
        }
      } catch {
        lastFocusRef.current = null
      }

      // Open the dialog
      try {
        if (!dialog.open) {
          dialog.showModal()
        }
      } catch {
        dialog.setAttribute("open", "")
      }
    } else if (dialog.open) {
      // Close the dialog
      try {
        dialog.close()
      } catch {
        dialog.removeAttribute("open")
      }
      restoreFocus()
    }
  }, [isOpen, issueId, restoreFocus])

  /**
   * Handle backdrop click - close when clicking outside the container.
   */
  const handleMouseDown = useCallback(
    (ev: React.MouseEvent<HTMLDialogElement>): void => {
      if (ev.target === dialogRef.current) {
        ev.preventDefault()
        handleClose()
      }
    },
    [handleClose],
  )

  /**
   * Handle cancel event (Escape key on dialog).
   */
  const handleCancel = useCallback(
    (ev: React.SyntheticEvent<HTMLDialogElement>): void => {
      ev.preventDefault()
      handleClose()
    },
    [handleClose],
  )

  /**
   * Handle close button click.
   */
  const handleCloseClick = useCallback((): void => {
    handleClose()
  }, [handleClose])

  // Don't render if not open or no issue ID
  if (!isOpen || !issueId) {
    return null
  }

  return (
    <dialog
      ref={dialogRef}
      id="issue-dialog"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleMouseDown}
      onCancel={handleCancel}
      data-testid={testId}
    >
      <div className="issue-dialog__container" part="container">
        <header className="issue-dialog__header">
          <div className="issue-dialog__title">
            <span className="mono" id="issue-dialog-title">
              <IssueIdRenderer issueId={issueId} />
            </span>
          </div>
          <button
            type="button"
            className="issue-dialog__close"
            aria-label="Close"
            onClick={handleCloseClick}
          >
            &times;
          </button>
        </header>
        <div className="issue-dialog__body" id="issue-dialog-body">
          {children}
        </div>
      </div>
    </dialog>
  )
}
