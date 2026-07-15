import { type RefObject, useEffect } from "react"

import { isEditableElement } from "./is-editable-element.js"

/** Register global task-manager keyboard shortcuts. */
export function useAppHotkeys(
  /** Search input focused by the slash shortcut. */
  searchInput: RefObject<HTMLInputElement | null>,
  /** Open task creation. */
  onCreate: () => void,
  /** Move the current selection by one row. */
  onMoveSelection: (direction: -1 | 1) => void,
  /** Close transient UI. */
  onEscape: () => void,
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape()
        return
      }
      if (isEditableElement(event.target)) return
      if (event.key === "/") {
        event.preventDefault()
        searchInput.current?.focus()
      }
      if (event.key.toLocaleLowerCase() === "n") onCreate()
      if (event.key === "ArrowDown") onMoveSelection(1)
      if (event.key === "ArrowUp") onMoveSelection(-1)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onCreate, onEscape, onMoveSelection, searchInput])
}
