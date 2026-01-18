/**
 * React hook for accessing workspace management functionality.
 *
 * Provides React components with the ability to switch workspaces.
 * The workspace change handler is injected from main.tsx so React components
 * can trigger workspace switches.
 */
import { useCallback } from "react"

/**
 * Workspace change handler function signature.
 */
export type WorkspaceChangeFn = (workspace_path: string) => Promise<void>

/** Module-level reference to the workspace change handler. */
let workspaceChangeHandler: WorkspaceChangeFn | null = null

/**
 * Set the workspace change handler.
 *
 * Called by main.tsx after setting up workspace management.
 * This allows React components to trigger workspace switches.
 *
 * @param handler - The workspace change handler function.
 */
export function setWorkspaceChangeHandler(handler: WorkspaceChangeFn): void {
  workspaceChangeHandler = handler
}

/**
 * Get the current workspace change handler (for testing).
 *
 * @returns The current workspace change handler or null.
 */
export function getWorkspaceChangeHandler(): WorkspaceChangeFn | null {
  return workspaceChangeHandler
}

/**
 * Clear the workspace change handler (for testing).
 */
export function clearWorkspaceChangeHandler(): void {
  workspaceChangeHandler = null
}

/**
 * Hook to get the workspace change function.
 *
 * Returns a stable function that can be used to switch workspaces.
 * If the handler is not available, the function returns a rejected promise.
 *
 * @returns A function to change the current workspace.
 */
export function useWorkspaceChange(): WorkspaceChangeFn {
  const changeWorkspace = useCallback(async (workspace_path: string): Promise<void> => {
    if (!workspaceChangeHandler) {
      return Promise.reject(new Error("Workspace change handler not available"))
    }
    return workspaceChangeHandler(workspace_path)
  }, [])

  return changeWorkspace
}

/**
 * Hook to check if the workspace change handler is available.
 *
 * Useful for components that need to conditionally render based on
 * handler availability.
 *
 * @returns True if the workspace change handler has been initialized.
 */
export function useWorkspaceChangeAvailable(): boolean {
  return workspaceChangeHandler !== null
}
