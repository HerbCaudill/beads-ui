/**
 * IssueIdButton component.
 *
 * A clickable button that displays an issue ID and copies it to clipboard when clicked.
 * Shows "Copied" feedback briefly after copying.
 */
import { useCallback, useRef, useState } from "react"

export interface IssueIdButtonProps {
  /** The issue ID to display and copy (e.g., "UI-123"). */
  id: string
  /** Additional CSS class name to apply. */
  class_name?: string
  /** Duration in milliseconds to show "Copied" feedback. */
  duration_ms?: number
}

/**
 * Button that displays an issue ID and copies it to clipboard on click.
 *
 * @param props - Component props.
 */
export function IssueIdButton({
  id,
  class_name,
  duration_ms = 1200,
}: IssueIdButtonProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(
    async (e: React.MouseEvent | React.KeyboardEvent): Promise<void> => {
      e.preventDefault()
      e.stopPropagation()

      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(id)
        }
        setCopied(true)

        // Clear any existing timeout
        if (timeout_ref.current) {
          clearTimeout(timeout_ref.current)
        }

        timeout_ref.current = setTimeout(
          () => {
            setCopied(false)
            timeout_ref.current = null
          },
          Math.max(80, duration_ms),
        )
      } catch {
        // On failure, leave text as-is; no throw to avoid disruptive UX
      }
    },
    [id, duration_ms],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter" || e.key === " ") {
        void handleCopy(e)
      }
    },
    [handleCopy],
  )

  const class_names = ["mono", "id-copy", class_name].filter(Boolean).join(" ")

  return (
    <button
      type="button"
      className={class_names}
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
      aria-live="polite"
      title="Copy issue ID"
      aria-label={copied ? "Copied" : `Copy issue ID ${id}`}
    >
      {copied ? "Copied" : id}
    </button>
  )
}
