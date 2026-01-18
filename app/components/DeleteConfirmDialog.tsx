/**
 * DeleteConfirmDialog component.
 *
 * Renders a confirmation dialog for deleting an issue. Uses a native dialog element
 * with proper accessibility attributes (role="alertdialog", aria-modal).
 *
 * The dialog displays the issue ID and title to help users confirm they're deleting
 * the correct issue, and provides Cancel and Delete buttons.
 */

/**
 * Props for the DeleteConfirmDialog component.
 */
export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open. */
  isOpen: boolean
  /** The ID of the issue to delete. */
  issueId: string
  /** The title of the issue to delete. */
  issueTitle: string
  /** Handler called when the user confirms deletion. */
  onConfirm: () => void
  /** Handler called when the user cancels deletion. */
  onCancel: () => void
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * DeleteConfirmDialog component.
 *
 * Renders a confirmation dialog for deleting an issue.
 *
 * @param props - Component props.
 */
export function DeleteConfirmDialog({
  isOpen,
  issueId,
  issueTitle,
  onConfirm,
  onCancel,
  testId,
}: DeleteConfirmDialogProps): React.JSX.Element | null {
  if (!isOpen) return null

  return (
    <dialog
      open
      id="delete-confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      data-testid={testId ?? "delete-confirm-dialog"}
    >
      <div className="delete-confirm">
        <h2 className="delete-confirm__title">Delete Issue</h2>
        <p className="delete-confirm__message">
          Are you sure you want to delete issue <strong>{issueId}</strong> —{" "}
          <strong>{issueTitle || "(no title)"}</strong>? This action cannot be undone.
        </p>
        <div className="delete-confirm__actions">
          <button type="button" className="btn" onClick={onCancel} data-testid="delete-cancel-btn">
            Cancel
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={onConfirm}
            data-testid="delete-confirm-btn"
          >
            Delete
          </button>
        </div>
      </div>
    </dialog>
  )
}
