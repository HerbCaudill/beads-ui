/**
 * FatalErrorDialog component.
 *
 * Renders a fatal error dialog that surfaces stderr output from backend failures
 * (e.g., bd command errors). Uses a native dialog element with proper accessibility
 * attributes (role="alertdialog", aria-modal).
 *
 * The dialog displays an error title, message, and optional detailed information,
 * with Reload and Dismiss buttons.
 */

/**
 * Props for the FatalErrorDialog component.
 */
export interface FatalErrorDialogProps {
  /** Whether the dialog is open. */
  isOpen: boolean
  /** The error title to display. */
  title: string
  /** The error message to display. */
  message: string
  /** Optional detailed error information (e.g., stack trace). */
  detail?: string
  /** Handler called when the user clicks Reload. */
  onReload: () => void
  /** Handler called when the user clicks Dismiss. */
  onDismiss: () => void
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * FatalErrorDialog component.
 *
 * Renders a blocking error dialog for backend command failures.
 *
 * @param props - Component props.
 */
export function FatalErrorDialog({
  isOpen,
  title,
  message,
  detail,
  onReload,
  onDismiss,
  testId,
}: FatalErrorDialogProps): React.JSX.Element | null {
  if (!isOpen) return null

  const display_title = title || "Unexpected Error"
  const display_message = message || "An unrecoverable error occurred."
  const detail_text = typeof detail === "string" ? detail.trim() : ""
  const has_detail = detail_text.length > 0

  return (
    <dialog
      open
      id="fatal-error-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fatal-error-title"
      aria-describedby="fatal-error-message"
      data-testid={testId ?? "fatal-error-dialog"}
    >
      <div className="fatal-error">
        <div className="fatal-error__icon" aria-hidden="true">
          !
        </div>
        <div className="fatal-error__body">
          <p className="fatal-error__eyebrow">Critical</p>
          <h2 className="fatal-error__title" id="fatal-error-title">
            {display_title}
          </h2>
          <p className="fatal-error__message" id="fatal-error-message">
            {display_message}
          </p>
          {has_detail ?
            <pre className="fatal-error__detail" data-testid="fatal-error-detail">
              {detail_text}
            </pre>
          : null}
          <div className="fatal-error__actions">
            <button
              type="button"
              className="btn primary"
              onClick={onReload}
              data-testid="fatal-error-reload"
            >
              Reload
            </button>
            <button
              type="button"
              className="btn"
              onClick={onDismiss}
              data-testid="fatal-error-dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
