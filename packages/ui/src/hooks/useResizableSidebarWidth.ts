import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import {
  TASK_LIST_SIDEBAR_DEFAULT_WIDTH,
  TASK_LIST_SIDEBAR_KEYBOARD_STEP,
  TASK_LIST_SIDEBAR_MAX_WIDTH,
  TASK_LIST_SIDEBAR_MIN_WIDTH,
} from "../constants"

/** Manage the task list sidebar width while its separator is dragged. */
export function useResizableSidebarWidth() {
  const [width, setWidth] = useState(TASK_LIST_SIDEBAR_DEFAULT_WIDTH)
  const dragOriginRef = useRef<DragOrigin | null>(null)

  /** Stop the active resize interaction and restore document selection. */
  const stopResizing = useCallback(() => {
    dragOriginRef.current = null
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  /** Resize from the pointer position relative to the drag origin. */
  const handlePointerMove = useCallback((event: PointerEvent) => {
    const dragOrigin = dragOriginRef.current
    if (!dragOrigin) return

    const nextWidth = dragOrigin.width + event.clientX - dragOrigin.clientX
    setWidth(
      Math.min(TASK_LIST_SIDEBAR_MAX_WIDTH, Math.max(TASK_LIST_SIDEBAR_MIN_WIDTH, nextWidth)),
    )
  }, [])

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", stopResizing)
    window.addEventListener("pointercancel", stopResizing)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", stopResizing)
      window.removeEventListener("pointercancel", stopResizing)
      stopResizing()
    }
  }, [handlePointerMove, stopResizing])

  /** Begin resizing from the current pointer position and sidebar width. */
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      dragOriginRef.current = { clientX: event.clientX, width }
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    },
    [width],
  )

  /** Resize by one step when an arrow key is pressed on the separator. */
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return

    event.preventDefault()
    const direction = event.key === "ArrowLeft" ? -1 : 1
    setWidth((currentWidth) =>
      Math.min(
        TASK_LIST_SIDEBAR_MAX_WIDTH,
        Math.max(
          TASK_LIST_SIDEBAR_MIN_WIDTH,
          currentWidth + direction * TASK_LIST_SIDEBAR_KEYBOARD_STEP,
        ),
      ),
    )
  }, [])

  return { handleKeyDown, handlePointerDown, width }
}

/** Position and width at the start of a resize interaction. */
type DragOrigin = {
  /** Horizontal pointer position in pixels. */
  clientX: number
  /** Sidebar width in pixels. */
  width: number
}
