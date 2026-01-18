/**
 * NewIssueDialog component - React form dialog for creating new issues.
 *
 * This component provides the modal dialog functionality for creating
 * new issues. It manages:
 * - Opening/closing the native <dialog> element
 * - Form state with validation
 * - Create issue via transport
 * - Save/load user preferences to localStorage
 * - Navigate to created issue after success
 */
import { useCallback, useEffect, useRef, useState } from "react"

import type { IssueLite } from "../../types/issues.js"
import { useTransport } from "../hooks/index.js"
import { ISSUE_TYPES, typeLabel } from "../utils/issue-type.js"
import { priority_levels } from "../utils/priority.js"

/**
 * Props for the NewIssueDialog component.
 */
export interface NewIssueDialogProps {
  /** Whether the dialog is open. */
  isOpen: boolean
  /** Handler called when the dialog should close. */
  onClose: () => void
  /** Handler called when an issue is created, receives the issue ID. */
  onCreated?: (id: string) => void
  /** Optional test ID for testing. */
  testId?: string
}

/** LocalStorage keys for persisting user preferences. */
const STORAGE_KEY_TYPE = "beads-ui.new.type"
const STORAGE_KEY_PRIORITY = "beads-ui.new.priority"

/**
 * Load default type from localStorage.
 *
 * @returns The stored type or empty string.
 */
function loadDefaultType(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY_TYPE) ?? ""
  } catch {
    return ""
  }
}

/**
 * Load default priority from localStorage.
 *
 * @returns The stored priority or "2" (Medium).
 */
function loadDefaultPriority(): string {
  try {
    const p = window.localStorage.getItem(STORAGE_KEY_PRIORITY)
    if (p && /^\d$/.test(p)) {
      return p
    }
    return "2"
  } catch {
    return "2"
  }
}

/**
 * Save defaults to localStorage.
 *
 * @param type - The issue type.
 * @param priority - The priority value.
 */
function saveDefaults(type: string, priority: string): void {
  try {
    if (type.length > 0) {
      window.localStorage.setItem(STORAGE_KEY_TYPE, type)
    }
    if (priority.length > 0) {
      window.localStorage.setItem(STORAGE_KEY_PRIORITY, priority)
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Extract numeric suffix from an id like "UI-123"; return -1 when absent.
 *
 * @param id - Issue ID.
 * @returns Numeric suffix or -1.
 */
function idNumeric(id: string): number {
  const m = /-(\d+)$/.exec(String(id || ""))
  return m && m[1] ? Number(m[1]) : -1
}

/**
 * NewIssueDialog component.
 *
 * Renders a modal dialog for creating new issues using the native <dialog> element.
 *
 * @param props - Component props.
 */
export function NewIssueDialog({
  isOpen,
  onClose,
  onCreated,
  testId,
}: NewIssueDialogProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const transport = useTransport()

  // Form state
  const [title, setTitle] = useState("")
  const [issueType, setIssueType] = useState(loadDefaultType)
  const [priority, setPriority] = useState(loadDefaultPriority)
  const [labels, setLabels] = useState("")
  const [description, setDescription] = useState("")

  // UI state
  const [error, setError] = useState("")
  const [isBusy, setIsBusy] = useState(false)

  /**
   * Reset form to initial state.
   */
  const resetForm = useCallback((): void => {
    setTitle("")
    setIssueType(loadDefaultType())
    setPriority(loadDefaultPriority())
    setLabels("")
    setDescription("")
    setError("")
    setIsBusy(false)
  }, [])

  /**
   * Handle close request.
   */
  const handleClose = useCallback((): void => {
    try {
      dialogRef.current?.close()
    } catch {
      dialogRef.current?.removeAttribute("open")
    }
    onClose()
  }, [onClose])

  // Open/close dialog based on isOpen prop
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      resetForm()
      try {
        if (!dialog.open) {
          dialog.showModal()
        }
      } catch {
        dialog.setAttribute("open", "")
      }
      // Focus the title input
      setTimeout(() => {
        try {
          titleInputRef.current?.focus()
        } catch {
          // Ignore focus errors
        }
      }, 0)
    } else if (dialog.open) {
      try {
        dialog.close()
      } catch {
        dialog.removeAttribute("open")
      }
    }
  }, [isOpen, resetForm])

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
   * Handle form submission.
   */
  const handleSubmit = useCallback(
    async (ev: React.FormEvent): Promise<void> => {
      ev.preventDefault()
      setError("")

      // Validate
      const trimmedTitle = title.trim()
      if (trimmedTitle.length === 0) {
        setError("Title is required")
        titleInputRef.current?.focus()
        return
      }

      const prio = Number(priority || "2")
      if (!(prio >= 0 && prio <= 4)) {
        setError("Priority must be 0..4")
        return
      }

      // Parse labels
      const labelList = labels
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0)

      // Build payload
      const payload: Record<string, unknown> = { title: trimmedTitle }
      if (issueType.length > 0) {
        payload.type = issueType
      }
      payload.priority = prio
      if (description.trim().length > 0) {
        payload.description = description.trim()
      }

      setIsBusy(true)
      try {
        await transport("create-issue", payload)
      } catch {
        setIsBusy(false)
        setError("Failed to create issue")
        return
      }

      // Save preferences
      saveDefaults(issueType, priority)

      // Find the created issue ID by matching title among open issues
      let createdId = ""
      try {
        const list = (await transport("list-issues", {
          filters: { status: "open", limit: 50 },
        })) as IssueLite[] | null

        if (Array.isArray(list)) {
          const matches = list.filter(it => String(it.title || "") === trimmedTitle)
          if (matches.length > 0) {
            let best = matches[0]!
            for (const it of matches) {
              const ai = idNumeric(best.id || "")
              const bi = idNumeric(it.id || "")
              if (bi > ai) {
                best = it
              }
            }
            createdId = String(best.id || "")
          }
        }
      } catch {
        // Ignore list errors
      }

      // Apply labels if any
      if (createdId && labelList.length > 0) {
        for (const label of labelList) {
          try {
            await transport("label-add", { id: createdId, label })
          } catch {
            // Ignore label failures
          }
        }
      }

      setIsBusy(false)
      handleClose()

      // Notify parent of created issue
      if (createdId && onCreated) {
        onCreated(createdId)
      }
    },
    [title, issueType, priority, labels, description, transport, handleClose, onCreated],
  )

  /**
   * Handle Ctrl/Cmd+Enter to submit.
   */
  const handleKeyDown = useCallback(
    (ev: React.KeyboardEvent): void => {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault()
        void handleSubmit(ev as unknown as React.FormEvent)
      }
    },
    [handleSubmit],
  )

  // Don't render if not open
  if (!isOpen) {
    return null
  }

  return (
    <dialog
      ref={dialogRef}
      id="new-issue-dialog"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleMouseDown}
      onCancel={handleCancel}
      data-testid={testId}
    >
      <div className="new-issue__container" part="container">
        <header className="new-issue__header">
          <div className="new-issue__title">New Issue</div>
          <button
            type="button"
            className="new-issue__close"
            aria-label="Close"
            onClick={handleClose}
          >
            &times;
          </button>
        </header>
        <div className="new-issue__body">
          <form
            id="new-issue-form"
            className="new-issue__form"
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
          >
            <label htmlFor="new-title">Title</label>
            <input
              ref={titleInputRef}
              id="new-title"
              name="title"
              type="text"
              required
              placeholder="Short summary"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isBusy}
            />

            <label htmlFor="new-type">Type</label>
            <select
              id="new-type"
              name="type"
              aria-label="Issue type"
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              disabled={isBusy}
            >
              <option value="">— Select —</option>
              {ISSUE_TYPES.map(t => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>

            <label htmlFor="new-priority">Priority</label>
            <select
              id="new-priority"
              name="priority"
              aria-label="Priority"
              value={priority}
              onChange={e => setPriority(e.target.value)}
              disabled={isBusy}
            >
              {priority_levels.map((label, i) => (
                <option key={i} value={String(i)}>
                  {i} – {label}
                </option>
              ))}
            </select>

            <label htmlFor="new-labels">Labels</label>
            <input
              id="new-labels"
              name="labels"
              type="text"
              placeholder="comma,separated"
              value={labels}
              onChange={e => setLabels(e.target.value)}
              disabled={isBusy}
            />

            <label htmlFor="new-description">Description</label>
            <textarea
              id="new-description"
              name="description"
              rows={6}
              placeholder="Optional markdown description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isBusy}
            />

            {error && (
              <div
                aria-live="polite"
                role="status"
                className="new-issue__error"
                id="new-issue-error"
              >
                {error}
              </div>
            )}

            <div className="new-issue__actions" style={{ gridColumn: "1 / -1" }}>
              <button type="button" id="btn-cancel" onClick={handleClose} disabled={isBusy}>
                Cancel (Esc)
              </button>
              <button type="submit" id="btn-create" disabled={isBusy}>
                {isBusy ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  )
}
