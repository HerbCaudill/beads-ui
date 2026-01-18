/**
 * LabelsSection component.
 *
 * Displays the labels panel in the issue detail view with:
 * - List of existing labels with remove buttons
 * - Input field to add new labels
 * - Add button to submit new labels
 *
 * Labels can be added via the Add button or by pressing Enter in the input field.
 */
import { useCallback, useState } from "react"

import { useDetailContext } from "./DetailView.js"

/**
 * Props for LabelsSection component.
 */
export interface LabelsSectionProps {
  /** Array of current labels. */
  labels: string[]
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * LabelsSection component.
 *
 * Renders the labels panel with existing labels and an input to add new ones.
 */
export function LabelsSection({ labels, testId }: LabelsSectionProps): React.JSX.Element {
  const { issue, transport } = useDetailContext()

  // Local state for the new label input
  const [newLabelText, setNewLabelText] = useState("")
  const [isPending, setIsPending] = useState(false)

  /**
   * Handle input change for new label text.
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewLabelText(e.target.value)
  }, [])

  /**
   * Add a new label.
   */
  const addLabel = useCallback(async (): Promise<void> => {
    if (!issue || isPending) return

    const text = newLabelText.trim()
    if (!text) return

    setIsPending(true)
    try {
      await transport("label-add", {
        id: issue.id,
        label: text,
      })
      setNewLabelText("")
    } catch (error) {
      console.error("Failed to add label:", error)
    } finally {
      setIsPending(false)
    }
  }, [issue, isPending, newLabelText, transport])

  /**
   * Remove an existing label.
   */
  const removeLabel = useCallback(
    async (label: string): Promise<void> => {
      if (!issue || isPending) return

      setIsPending(true)
      try {
        await transport("label-remove", {
          id: issue.id,
          label,
        })
      } catch (error) {
        console.error("Failed to remove label:", error)
      } finally {
        setIsPending(false)
      }
    },
    [issue, isPending, transport],
  )

  /**
   * Handle keydown on the input field.
   * Adds the label when Enter is pressed.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        e.preventDefault()
        void addLabel()
      }
    },
    [addLabel],
  )

  /**
   * Handle Add button click.
   */
  const handleAddClick = useCallback((): void => {
    void addLabel()
  }, [addLabel])

  /**
   * Create a handler for removing a specific label.
   */
  const handleRemoveClick = useCallback(
    (label: string) => (): void => {
      void removeLabel(label)
    },
    [removeLabel],
  )

  return (
    <div className="props-card labels" data-testid={testId}>
      <div>
        <div className="props-card__title">Labels</div>
      </div>
      <ul>
        {labels.map(label => (
          <li key={label}>
            <span className="badge" title={label}>
              {label}
              <button
                className="icon-button"
                title="Remove label"
                aria-label={`Remove label ${label}`}
                onClick={handleRemoveClick(label)}
                style={{ marginLeft: "6px" }}
                disabled={isPending}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="props-card__footer">
        <input
          type="text"
          placeholder="Label"
          size={12}
          value={newLabelText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isPending}
        />
        <button onClick={handleAddClick} disabled={isPending}>
          Add
        </button>
      </div>
    </div>
  )
}
