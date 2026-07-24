import type { ReactNode } from "react"

import { TASK_LIST_SIDEBAR_MAX_WIDTH, TASK_LIST_SIDEBAR_MIN_WIDTH } from "../constants"
import { useResizableSidebarWidth } from "../hooks/useResizableSidebarWidth"

/** Render the task list sidebar with a draggable vertical separator. */
export function ResizableSidebar({ children }: Props) {
  const { handleKeyDown, handlePointerDown, width } = useResizableSidebarWidth()

  return (
    <aside
      aria-label="Task list sidebar"
      className="border-border relative shrink-0 border-r"
      style={{ width }}
    >
      {children}
      <div
        aria-label="Resize task list sidebar"
        aria-orientation="vertical"
        aria-valuemax={TASK_LIST_SIDEBAR_MAX_WIDTH}
        aria-valuemin={TASK_LIST_SIDEBAR_MIN_WIDTH}
        aria-valuenow={width}
        className="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none outline-none"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        role="separator"
        tabIndex={0}
      >
        <div className="bg-ring absolute inset-y-0 left-1/2 w-px -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </div>
    </aside>
  )
}

/** Props accepted by the resizable task list sidebar. */
type Props = {
  /** Sidebar content. */
  children: ReactNode
}
