import { useCallback } from "react"
import { TaskPanel } from "./TaskPanel"
import { type SearchInputHandle } from "./SearchInput"
import { useTasks } from "../../hooks"
import {
  useBeadsViewStore,
  selectTaskSearchQuery,
  selectClosedTimeFilter,
  selectTasks,
  selectInitialTaskCount,
  selectAccentColor,
} from "../../store"
import type { ClosedTasksTimeFilter } from "../../types"

/**
 * Controller component for TaskPanel.
 *
 * Connects data hooks to the TaskPanel presentational component.
 * Handles task loading and wires up the progress bar.
 */
export function TaskPanelController({
  searchInputRef,
  onTaskClick,
  onOpenTask,
  showProgress = false,
  isLoadingExternal = false,
  hideQuickInput = true,
}: TaskPanelControllerProps) {
  const { tasks, isLoading: isLoadingTasks, refresh } = useTasks({ all: true })
  const isLoading = isLoadingTasks || isLoadingExternal
  const searchQuery = useBeadsViewStore(selectTaskSearchQuery)
  const closedTimeFilter = useBeadsViewStore(selectClosedTimeFilter)
  const setClosedTimeFilter = useBeadsViewStore((state) => state.setClosedTimeFilter)
  const setVisibleTaskIds = useBeadsViewStore((state) => state.setVisibleTaskIds)
  const allStoreTasks = useBeadsViewStore(selectTasks)
  const initialTaskCount = useBeadsViewStore(selectInitialTaskCount)
  const accentColor = useBeadsViewStore(selectAccentColor)

  const handleClosedTimeFilterChange = useCallback(
    (filter: ClosedTasksTimeFilter) => setClosedTimeFilter(filter),
    [setClosedTimeFilter],
  )

  const handleVisibleTaskIdsChange = useCallback(
    (ids: string[]) => setVisibleTaskIds(ids),
    [setVisibleTaskIds],
  )

  const handleTaskCreated = useCallback(() => {
    void refresh()
  }, [refresh])

  return (
    <TaskPanel
      tasks={tasks}
      onTaskClick={onTaskClick}
      isLoading={isLoading}
      searchQuery={searchQuery}
      closedTimeFilter={closedTimeFilter}
      onClosedTimeFilterChange={handleClosedTimeFilterChange}
      onVisibleTaskIdsChange={handleVisibleTaskIdsChange}
      showQuickInput={!hideQuickInput}
      onTaskCreated={handleTaskCreated}
      showProgress={showProgress}
      progressTasks={allStoreTasks}
      initialTaskCount={initialTaskCount}
      accentColor={accentColor}
      searchInputRef={searchInputRef}
      onOpenTask={onOpenTask}
    />
  )
}

/** Props for TaskPanelController component. */
export interface TaskPanelControllerProps {
  /** Ref to access SearchInput methods */
  searchInputRef?: React.RefObject<SearchInputHandle | null>
  /** Handler when a task is clicked */
  onTaskClick?: (taskId: string) => void
  /** Handler when a task should be opened */
  onOpenTask?: (taskId: string) => void
  /** Whether to show the progress summary. */
  showProgress?: boolean
  /** External loading state supplied by the host application. */
  isLoadingExternal?: boolean
  /** Hide quick task input */
  hideQuickInput?: boolean
}
