/**
 * EditableMarkdownField component.
 *
 * A reusable component for editing markdown text fields in the issue detail view.
 * Used for description, design, notes, and acceptance criteria fields.
 *
 * Features:
 * - Renders markdown in read mode using DOMPurify and marked
 * - Textarea in edit mode
 * - Click or Enter to enter edit mode
 * - Ctrl+Enter (or Cmd+Enter on Mac) to save
 * - Escape to cancel
 */
import DOMPurify from "dompurify"
import { marked } from "marked"
import { useCallback, useEffect, useRef, useState } from "react"

import { useDetailContext } from "./DetailView.js"

/**
 * Props for the EditableMarkdownField component.
 */
export interface EditableMarkdownFieldProps {
  /**
   * The field name to update in the issue.
   * Must be one of: "description", "design", "notes", "acceptance".
   */
  field: "description" | "design" | "notes" | "acceptance"
  /**
   * The current value of the field.
   */
  value: string
  /**
   * The label to display above the field (shown when field has content).
   */
  label: string
  /**
   * Placeholder text shown when field is empty (in read mode).
   */
  placeholder: string
  /**
   * Optional CSS class name for the container.
   */
  className?: string
  /**
   * Optional test ID for testing.
   */
  testId?: string
}

/**
 * Render Markdown safely as HTML using marked and DOMPurify.
 *
 * @param markdown - Markdown source text
 * @returns Sanitized HTML string
 */
function renderMarkdownToHtml(markdown: string): string {
  const parsed = marked.parse(markdown) as string
  return DOMPurify.sanitize(parsed)
}

/**
 * EditableMarkdownField component.
 *
 * Renders a markdown field that can be clicked to edit. In read mode, displays
 * rendered markdown. In edit mode, displays a textarea with Save/Cancel buttons.
 *
 * @param props - Component props.
 */
export function EditableMarkdownField({
  field,
  value,
  label,
  placeholder,
  className,
  testId,
}: EditableMarkdownFieldProps): React.JSX.Element {
  const { issue, transport } = useDetailContext()

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Ref for the textarea to focus it when entering edit mode
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Determine if field has content
  const hasContent = value.trim().length > 0

  /**
   * Enter edit mode.
   */
  const enterEditMode = useCallback((): void => {
    setEditValue(value)
    setIsEditing(true)
  }, [value])

  /**
   * Exit edit mode without saving.
   */
  const cancelEdit = useCallback((): void => {
    setIsEditing(false)
    setEditValue("")
  }, [])

  /**
   * Save the edited value.
   */
  const saveValue = useCallback(async (): Promise<void> => {
    if (!issue || isSaving) return

    const newValue = editValue
    const oldValue = value

    // Don't save if the value hasn't changed
    if (newValue === oldValue) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await transport("edit-text", {
        id: issue.id,
        field,
        value: newValue,
      })
      setIsEditing(false)
    } catch (error) {
      // On error, keep editing mode open so user can retry
      // The transport layer should handle showing error toast
      console.error(`Failed to save ${field}:`, error)
    } finally {
      setIsSaving(false)
    }
  }, [issue, isSaving, editValue, value, field, transport])

  /**
   * Handle click on the editable content.
   */
  const handleClick = useCallback((): void => {
    enterEditMode()
  }, [enterEditMode])

  /**
   * Handle keydown on the editable content (for keyboard accessibility).
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        enterEditMode()
      }
    },
    [enterEditMode],
  )

  /**
   * Handle textarea change.
   */
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setEditValue(e.target.value)
  }, [])

  /**
   * Handle keydown in the textarea.
   */
  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void saveValue()
      } else if (e.key === "Escape") {
        e.preventDefault()
        cancelEdit()
      }
    },
    [saveValue, cancelEdit],
  )

  /**
   * Handle save button click.
   */
  const handleSaveClick = useCallback((): void => {
    void saveValue()
  }, [saveValue])

  /**
   * Handle cancel button click.
   */
  const handleCancelClick = useCallback((): void => {
    cancelEdit()
  }, [cancelEdit])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end of text
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  // Container class name
  const containerClass = className || label.toLowerCase()

  // Render edit mode
  if (isEditing) {
    return (
      <div className={containerClass} data-testid={testId}>
        {hasContent && <div className="props-card__title">{label}</div>}
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
          disabled={isSaving}
          rows={8}
          style={{ width: "100%" }}
          aria-label={`Edit ${label.toLowerCase()}`}
        />
        <div className="editable-actions">
          <button onClick={handleSaveClick} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button onClick={handleCancelClick} disabled={isSaving}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Render read mode
  const renderedHtml = hasContent ? renderMarkdownToHtml(value) : ""

  return (
    <div className={containerClass} data-testid={testId}>
      {hasContent && <div className="props-card__title">{label}</div>}
      <div
        className="md editable"
        tabIndex={0}
        role="button"
        aria-label={`Edit ${label.toLowerCase()}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {hasContent ?
          <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        : <div className="muted">{placeholder}</div>}
      </div>
    </div>
  )
}
