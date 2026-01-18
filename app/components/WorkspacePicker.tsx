/**
 * React WorkspacePicker component.
 *
 * Shows the current project and allows switching between registered workspaces.
 * This is a React port of app/views/workspace-picker.ts.
 */
import { useCallback, useState } from "react"
import { useSyncExternalStore } from "react"

import { useAppStore, type WorkspaceState } from "../store/index.js"

/**
 * Extract the project name from a workspace path. Returns just the directory
 * name (e.g., 'myproject' from '/home/user/code/myproject').
 *
 * @param workspace_path - Full path to workspace.
 * @returns Project directory name.
 */
function getProjectName(workspace_path: string): string {
  if (!workspace_path) return "Unknown"
  const parts = workspace_path.split("/").filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1]! : "Unknown"
}

/**
 * Hook to subscribe to Zustand store for the workspace state.
 *
 * @returns The current workspace state.
 */
function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(
    callback => useAppStore.subscribe(callback),
    () => useAppStore.getState().workspace,
    () => useAppStore.getState().workspace,
  )
}

/**
 * Props for the WorkspacePicker component.
 */
export interface WorkspacePickerProps {
  /**
   * Callback when workspace is changed.
   *
   * @param workspace_path - The path of the newly selected workspace.
   */
  onWorkspaceChange: (workspace_path: string) => Promise<void>
  /**
   * Optional test ID for testing.
   */
  testId?: string
}

/**
 * Workspace picker dropdown component.
 *
 * Shows the current project name. When multiple workspaces are available,
 * displays a dropdown to switch between them.
 *
 * @param props - Component props.
 */
export function WorkspacePicker({
  onWorkspaceChange,
  testId,
}: WorkspacePickerProps): React.JSX.Element | null {
  const workspace = useWorkspace()
  const [isSwitching, setIsSwitching] = useState(false)

  const current = workspace.current
  const available = workspace.available

  /**
   * Handle workspace selection change.
   */
  const handleChange = useCallback(
    async (ev: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
      const new_path = ev.target.value
      const current_path = current?.path || ""

      if (new_path && new_path !== current_path) {
        setIsSwitching(true)
        try {
          await onWorkspaceChange(new_path)
        } catch {
          // Error handled by caller
        } finally {
          setIsSwitching(false)
        }
      }
    },
    [current?.path, onWorkspaceChange],
  )

  // Don't render if no workspaces available
  if (available.length === 0) {
    return null
  }

  // If only one workspace, show it as a simple label
  if (available.length === 1) {
    const ws = available[0]!
    const name = getProjectName(ws.path)
    return (
      <div className="workspace-picker workspace-picker--single" data-testid={testId}>
        <span className="workspace-picker__label" title={ws.path}>
          {name}
        </span>
      </div>
    )
  }

  // Multiple workspaces: show dropdown
  const current_path = current?.path || ""
  return (
    <div className="workspace-picker" data-testid={testId}>
      <select
        className="workspace-picker__select"
        onChange={handleChange}
        disabled={isSwitching}
        aria-label="Select project workspace"
        value={current_path}
        data-testid={testId ? `${testId}-select` : undefined}
      >
        {available.map(ws => (
          <option key={ws.path} value={ws.path} title={ws.path}>
            {getProjectName(ws.path)}
          </option>
        ))}
      </select>
      {isSwitching && (
        <span
          className="workspace-picker__loading"
          aria-hidden="true"
          data-testid={testId ? `${testId}-loading` : undefined}
        />
      )}
    </div>
  )
}
