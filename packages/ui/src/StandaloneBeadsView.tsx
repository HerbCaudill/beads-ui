import { useCallback, useEffect, useRef, useState } from "react"

import { HotkeysDialog } from "./components/HotkeysDialog"
import { RepositoryHeader } from "./components/RepositoryHeader"
import { ResizableSidebar } from "./components/ResizableSidebar"
import { EmptyTaskState } from "./components/tasks/EmptyTaskState"
import {
  TaskDetailsController,
  TaskPanelController,
  type SearchInputHandle,
} from "./components/tasks"
import { useTaskDialog, useTaskDialogRouter, useTaskMutations, useTaskNavigation } from "./hooks"
import { useBeadsHotkeys } from "./hotkeys"
import { useBeadsViewStore } from "./store"

/** Compose the extracted Beads View for one fixed workspace. */
export function StandaloneBeadsView(_props: Props) {
  const searchInputRef = useRef<SearchInputHandle>(null)
  const [hotkeysOpen, setHotkeysOpen] = useState(false)
  const initialTaskCount = useBeadsViewStore((state) => state.initialTaskCount)
  const refreshTasks = useBeadsViewStore((state) => state.refreshTasks)
  const setInitialTaskCount = useBeadsViewStore((state) => state.setInitialTaskCount)
  const setSelectedTaskId = useBeadsViewStore((state) => state.setSelectedTaskId)
  const tasks = useBeadsViewStore((state) => state.tasks)
  const taskDialog = useTaskDialog({
    onTaskDeleted: refreshTasks,
    onTaskUpdated: refreshTasks,
  })
  const taskRouter = useTaskDialogRouter({ taskDialog })

  useTaskMutations()

  useEffect(() => {
    if (taskDialog.selectedTask) setSelectedTaskId(taskDialog.selectedTask.id)
  }, [setSelectedTaskId, taskDialog.selectedTask])
  useEffect(() => {
    if (initialTaskCount === null && tasks.length > 0) setInitialTaskCount(tasks.length)
  }, [initialTaskCount, setInitialTaskCount, tasks.length])

  const openTask = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId)
      taskRouter.navigateToTask(taskId)
      void taskDialog.openDialogById(taskId)
    },
    [setSelectedTaskId, taskDialog.openDialogById, taskRouter.navigateToTask],
  )
  const closeTask = useCallback(() => {
    setSelectedTaskId(null)
    taskRouter.closeTaskDialog()
  }, [setSelectedTaskId, taskRouter.closeTaskDialog])
  const focusSearch = useCallback(() => searchInputRef.current?.focus(), [])
  const showHotkeys = useCallback(() => setHotkeysOpen(true), [])
  const hideHotkeys = useCallback(() => setHotkeysOpen(false), [])
  const { navigateNext, navigatePrevious, openSelected } = useTaskNavigation({
    onOpenTask: openTask,
  })
  const { registeredHotkeys } = useBeadsHotkeys({
    handlers: {
      focusSearch,
      nextTask: navigateNext,
      openTask: openSelected,
      previousTask: navigatePrevious,
      showHotkeys,
    },
  })

  return (
    <div className="bg-background text-foreground flex h-dvh min-h-0 flex-col overflow-hidden">
      <RepositoryHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ResizableSidebar>
          <TaskPanelController
            searchInputRef={searchInputRef}
            onTaskClick={openTask}
            onOpenTask={openTask}
            hideQuickInput={false}
            showProgress
          />
        </ResizableSidebar>
        <main className="min-w-0 flex-1 overflow-y-auto">
          {taskDialog.selectedTask ? (
            <TaskDetailsController
              task={taskDialog.selectedTask}
              open={taskDialog.isOpen}
              onClose={closeTask}
              onSave={taskDialog.saveTask}
              onDelete={taskDialog.deleteTask}
            />
          ) : (
            <EmptyTaskState error={taskDialog.error} isLoading={taskDialog.isLoading} />
          )}
        </main>
      </div>
      <HotkeysDialog open={hotkeysOpen} onClose={hideHotkeys} hotkeys={registeredHotkeys} />
    </div>
  )
}

/** Props accepted by the standalone application composition. */
export type Props = Record<string, never>
