/**
 * DetailHeader component.
 *
 * Displays the header section of the issue detail view with an editable title.
 * Supports click-to-edit mode with keyboard navigation:
 * - Click or Enter on the title to enter edit mode
 * - Enter while editing to save
 * - Escape to cancel and revert changes
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { useDetailContext } from "./DetailView.js"

/**
 * Props for the DetailHeader component.
 */
export interface DetailHeaderProps {
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * DetailHeader component.
 *
 * Renders the issue title with inline editing support.
 *
 * @param props - Component props.
 */
export function DetailHeader({ testId }: DetailHeaderProps): React.JSX.Element {
  const { issue, transport } = useDetailContext()

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Ref for the input element to focus it when entering edit mode
  const inputRef = useRef<HTMLInputElement>(null)

  // Get the current title
  const title = issue?.title || ""
  const displayTitle = title || "(no title)"

  /**
   * Enter edit mode.
   */
  const enterEditMode = useCallback((): void => {
    setEditValue(title)
    setIsEditing(true)
  }, [title])

  /**
   * Exit edit mode without saving.
   */
  const cancelEdit = useCallback((): void => {
    setIsEditing(false)
    setEditValue("")
  }, [])

  /**
   * Save the edited title.
   */
  const saveTitle = useCallback(async (): Promise<void> => {
    if (!issue || isSaving) return

    const newValue = editValue.trim()
    const oldValue = title

    // Don't save if the value hasn't changed (including trimmed)
    if (newValue === oldValue) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await transport("edit-text", {
        id: issue.id,
        field: "title",
        value: newValue,
      })
      setIsEditing(false)
    } catch (error) {
      // On error, keep editing mode open so user can retry
      // The transport layer should handle showing error toast
      console.error("Failed to save title:", error)
    } finally {
      setIsSaving(false)
    }
  }, [issue, isSaving, editValue, title, transport])

  /**
   * Handle click on the title span.
   */
  const handleTitleClick = useCallback((): void => {
    enterEditMode()
  }, [enterEditMode])

  /**
   * Handle keydown on the title span (for keyboard accessibility).
   */
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter") {
        e.preventDefault()
        enterEditMode()
      }
    },
    [enterEditMode],
  )

  /**
   * Handle input change.
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setEditValue(e.target.value)
  }, [])

  /**
   * Handle keydown in the input.
   */
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter") {
        e.preventDefault()
        void saveTitle()
      } else if (e.key === "Escape") {
        e.preventDefault()
        cancelEdit()
      }
    },
    [saveTitle, cancelEdit],
  )

  /**
   * Handle save button click.
   */
  const handleSaveClick = useCallback((): void => {
    void saveTitle()
  }, [saveTitle])

  /**
   * Handle cancel button click.
   */
  const handleCancelClick = useCallback((): void => {
    cancelEdit()
  }, [cancelEdit])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Select all text for easy replacement
      inputRef.current.select()
    }
  }, [isEditing])

  // Render edit mode
  if (isEditing) {
    return (
      <div className="detail-title" data-testid={testId}>
        <h2>
          <input
            ref={inputRef}
            type="text"
            aria-label="Edit title"
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            disabled={isSaving}
          />
          <button onClick={handleSaveClick} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button onClick={handleCancelClick} disabled={isSaving}>
            Cancel
          </button>
        </h2>
      </div>
    )
  }

  // Render read mode
  return (
    <div className="detail-title" data-testid={testId}>
      <h2>
        <span
          className="editable"
          tabIndex={0}
          role="button"
          aria-label="Edit title"
          onClick={handleTitleClick}
          onKeyDown={handleTitleKeyDown}
        >
          {displayTitle}
        </span>
      </h2>
    </div>
  )
}
