/**
 * DependencyList component.
 *
 * Displays a list of dependency or dependent issues in the issue detail view with:
 * - List of linked issues with type badge, title, and remove button
 * - Each item is clickable to navigate to the linked issue
 * - Input field to add new dependencies by issue ID
 * - Add button to submit new dependencies
 *
 * Used twice in DetailView: once for Dependencies and once for Dependents.
 */
import { useCallback, useState } from "react"

import type { DependencyRef } from "../../types/issues.js"
import { parseView, type ViewName } from "../router.js"
import { issueHashFor } from "../utils/issue-url.js"
import { showToast } from "../utils/toast.js"
import { useDetailContext } from "./DetailView.js"
import { TypeBadge } from "./TypeBadge.js"

/**
 * Props for DependencyList component.
 */
export interface DependencyListProps {
  /** Title for the section - "Dependencies" or "Dependents". */
  title: "Dependencies" | "Dependents"
  /** Array of dependency references to display. */
  items: DependencyRef[]
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * DependencyList component.
 *
 * Renders a list of dependencies or dependents with controls to add/remove them.
 *
 * For Dependencies (issues this issue depends on):
 * - Add: current issue depends on the target → dep-add(a=current, b=target)
 * - Remove: remove the dependency → dep-remove(a=current, b=target)
 *
 * For Dependents (issues that depend on this issue):
 * - Add: target depends on current issue → dep-add(a=target, b=current)
 * - Remove: remove the dependency → dep-remove(a=target, b=current)
 */
export function DependencyList({ title, items, testId }: DependencyListProps): React.JSX.Element {
  const { issue, transport, onNavigate } = useDetailContext()

  // Local state for the new dependency input
  const [newDepId, setNewDepId] = useState("")
  const [isPending, setIsPending] = useState(false)

  /**
   * Create a hash URL for navigating to an issue while preserving the current view.
   */
  const getIssueHref = useCallback((id: string): string => {
    const currentHash = typeof window !== "undefined" ? window.location.hash || "" : ""
    const view: ViewName = parseView(currentHash)
    return issueHashFor(view, id)
  }, [])

  /**
   * Handle input change for new dependency ID.
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewDepId(e.target.value)
  }, [])

  /**
   * Add a new dependency.
   */
  const addDependency = useCallback(async (): Promise<void> => {
    if (!issue || isPending) return

    const targetId = newDepId.trim()
    if (!targetId) {
      showToast("Enter a different issue id")
      return
    }

    // Can't add self as dependency
    if (targetId === issue.id) {
      showToast("Enter a different issue id")
      return
    }

    // Check for duplicates
    const existingIds = new Set(items.map(item => item.id))
    if (existingIds.has(targetId)) {
      showToast("Link already exists")
      return
    }

    setIsPending(true)
    try {
      if (title === "Dependencies") {
        // Current issue depends on target
        await transport("dep-add", {
          a: issue.id,
          b: targetId,
          view_id: issue.id,
        })
      } else {
        // Target depends on current issue
        await transport("dep-add", {
          a: targetId,
          b: issue.id,
          view_id: issue.id,
        })
      }
      setNewDepId("")
    } catch (error) {
      console.error("Failed to add dependency:", error)
      showToast("Failed to add dependency", "error")
    } finally {
      setIsPending(false)
    }
  }, [issue, isPending, newDepId, items, title, transport])

  /**
   * Remove an existing dependency.
   */
  const removeDependency = useCallback(
    async (depId: string): Promise<void> => {
      if (!issue || isPending) return

      setIsPending(true)
      try {
        if (title === "Dependencies") {
          // Current issue depends on depId
          await transport("dep-remove", {
            a: issue.id,
            b: depId,
            view_id: issue.id,
          })
        } else {
          // depId depends on current issue
          await transport("dep-remove", {
            a: depId,
            b: issue.id,
            view_id: issue.id,
          })
        }
      } catch (error) {
        console.error("Failed to remove dependency:", error)
        showToast("Failed to remove dependency", "error")
      } finally {
        setIsPending(false)
      }
    },
    [issue, isPending, title, transport],
  )

  /**
   * Handle keydown on the input field.
   * Adds the dependency when Enter is pressed.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        e.preventDefault()
        void addDependency()
      }
    },
    [addDependency],
  )

  /**
   * Handle Add button click.
   */
  const handleAddClick = useCallback((): void => {
    void addDependency()
  }, [addDependency])

  /**
   * Handle click on a dependency item to navigate to that issue.
   */
  const handleItemClick = useCallback(
    (id: string): void => {
      const href = getIssueHref(id)
      onNavigate(href)
    },
    [getIssueHref, onNavigate],
  )

  /**
   * Create a handler for removing a specific dependency.
   * Stops propagation to prevent triggering the item click.
   */
  const handleRemoveClick = useCallback(
    (depId: string) =>
      (e: React.MouseEvent): void => {
        e.stopPropagation()
        void removeDependency(depId)
      },
    [removeDependency],
  )

  // Test ID for the add input
  const inputTestId = title === "Dependencies" ? "add-dependency" : "add-dependent"

  return (
    <div className="props-card" data-testid={testId}>
      <div>
        <div className="props-card__title">{title}</div>
      </div>
      <ul>
        {items.map(dep => {
          const href = getIssueHref(dep.id)
          return (
            <li
              key={dep.id}
              data-href={href}
              onClick={() => handleItemClick(dep.id)}
              style={{ cursor: "pointer" }}
            >
              <TypeBadge issue_type={dep.issue_type} />
              <span className="text-truncate">{dep.title || dep.id}</span>
              <button
                aria-label={`Remove dependency ${dep.id}`}
                onClick={handleRemoveClick(dep.id)}
                disabled={isPending}
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
      <div className="props-card__footer">
        <input
          type="text"
          placeholder="Issue ID"
          value={newDepId}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          data-testid={inputTestId}
        />
        <button onClick={handleAddClick} disabled={isPending}>
          Add
        </button>
      </div>
    </div>
  )
}
