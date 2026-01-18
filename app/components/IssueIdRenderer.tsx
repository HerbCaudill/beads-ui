/**
 * IssueIdRenderer component - copyable issue ID badge.
 *
 * Displays an issue ID that can be clicked or keyboard-activated to copy
 * the full issue ID to the clipboard. Shows "Copied" feedback temporarily
 * after a successful copy.
 */
import { useCallback, useState } from "react"

/**
 * Props for the IssueIdRenderer component.
 */
export interface IssueIdRendererProps {
  /** Full issue ID including prefix (e.g., "UI-123"). */
  issueId: string
  /** Additional CSS class name to apply. */
  className?: string
  /** Duration in milliseconds to show "Copied" feedback. Default 1200. */
  durationMs?: number
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * IssueIdRenderer component.
 *
 * Renders a button that displays the issue ID and copies it to clipboard on click.
 * Shows "Copied" feedback temporarily after copying.
 *
 * @param props - Component props.
 */
export function IssueIdRenderer({
  issueId,
  className,
  durationMs = 1200,
  testId,
}: IssueIdRendererProps): React.JSX.Element {
  const [showCopied, setShowCopied] = useState(false)

  /**
   * Copy the issue ID to clipboard and show feedback.
   */
  const doCopy = useCallback(async (): Promise<void> => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(issueId)
      }
      setShowCopied(true)
      setTimeout(
        () => {
          setShowCopied(false)
        },
        Math.max(80, durationMs),
      )
    } catch {
      // On failure, don't show feedback - no throw to avoid disruptive UX
    }
  }, [issueId, durationMs])

  /**
   * Handle click to copy.
   */
  const handleClick = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>): void => {
      ev.preventDefault()
      ev.stopPropagation()
      void doCopy()
    },
    [doCopy],
  )

  /**
   * Handle keyboard activation.
   */
  const handleKeyDown = useCallback(
    (ev: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault()
        ev.stopPropagation()
        void doCopy()
      }
    },
    [doCopy],
  )

  const classNames = ["mono", "id-copy", className].filter(Boolean).join(" ")
  const displayText = showCopied ? "Copied" : issueId
  const ariaLabel = showCopied ? "Copied" : `Copy issue ID ${issueId}`

  return (
    <button
      type="button"
      className={classNames}
      title="Copy issue ID"
      aria-label={ariaLabel}
      aria-live="polite"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={testId}
    >
      {displayText}
    </button>
  )
}
