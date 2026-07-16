import type { RefObject } from "react"
import { cn } from "../../lib/cn"
import { SearchInput, type SearchInputHandle } from "./SearchInput"
import { TaskList } from "./TaskList"
import { QuickTaskInput, type CreatedIssue } from "./QuickTaskInput"
import { TaskProgressBar } from "./TaskProgressBar"
import { TaskListError } from "./TaskListError"
import type { Task, ClosedTasksTimeFilter } from "../../types"

/**
 * Sidebar panel for task management.
 * Renders quick task input, search, task list, and progress bar from data props.
 *
 * This is a presentational component — it owns its child layout but receives all data via props.
 * Use TaskPanelController for the connected version.
 */
export function TaskPanel({
  tasks = [],
  error = null,
  onTaskClick,
  isLoading = false,
  searchQuery,
  closedTimeFilter,
  onClosedTimeFilterChange,
  onVisibleTaskIdsChange,
  showQuickInput = false,
  onTaskCreated,
  showProgress = false,
  progressTasks,
  initialTaskCount = null,
  accentColor = null,
  searchInputRef,
  onOpenTask,
  className,
}: TaskPanelProps) {
  return (
    <div
      className={cn("flex h-full flex-col", className)}
      role="complementary"
      aria-label="Task sidebar"
    >
      {showQuickInput && (
        <div className="border-border shrink-0 border-b px-4 py-3">
          <QuickTaskInput onTaskCreated={onTaskCreated} />
        </div>
      )}

      {/* Search input */}
      <div className="shrink-0 px-3 py-2">
        <SearchInput ref={searchInputRef} onOpenTask={onOpenTask} />
      </div>

      {/* Scrollable task list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <TaskListError message={error} />
        ) : (
          <TaskList
            tasks={tasks}
            onTaskClick={onTaskClick}
            isLoading={isLoading}
            searchQuery={searchQuery}
            closedTimeFilter={closedTimeFilter}
            onClosedTimeFilterChange={onClosedTimeFilterChange}
            onVisibleTaskIdsChange={onVisibleTaskIdsChange}
          />
        )}
      </div>

      <TaskProgressBar
        showProgress={showProgress}
        tasks={progressTasks ?? tasks}
        initialTaskCount={initialTaskCount}
        accentColor={accentColor}
        closedTimeFilter={closedTimeFilter}
      />
    </div>
  )
}

/** Props for the TaskPanel component. */
export type TaskPanelProps = {
  /** Array of tasks to display in the task list */
  tasks?: Task[]
  /** Error returned while loading tasks. */
  error?: string | null
  /** Callback when a task is clicked */
  onTaskClick?: (id: string) => void
  /** Whether tasks are currently loading */
  isLoading?: boolean
  /** Search query to filter tasks */
  searchQuery?: string
  /** Time filter for closed tasks */
  closedTimeFilter?: ClosedTasksTimeFilter
  /** Callback when closed time filter changes */
  onClosedTimeFilterChange?: (filter: ClosedTasksTimeFilter) => void
  /** Callback when visible task IDs change */
  onVisibleTaskIdsChange?: (ids: string[]) => void

  /** Whether to show the quick task input at the top */
  showQuickInput?: boolean
  /** Callback when a new task is created via the quick input */
  onTaskCreated?: (issue: CreatedIssue) => void

  /** Whether to show the progress summary */
  showProgress?: boolean
  /** Tasks used for progress calculation (defaults to `tasks` if omitted) */
  progressTasks?: Task[]
  /** Initial task count for progress bar (hidden when null) */
  initialTaskCount?: number | null
  /** Accent color for the progress bar */
  accentColor?: string | null

  /** Reference to the search input element */
  searchInputRef?: RefObject<SearchInputHandle | null>
  /** Callback when a task is opened from search results */
  onOpenTask?: (taskId: string) => void

  /** Additional CSS classes to apply */
  className?: string
}
