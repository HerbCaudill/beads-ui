import { useEffect } from "react"

import { subscribeToWorkspaceChanges } from "./subscribe-to-workspace-changes.js"

/** Keep the application synchronized with external workspace changes. */
export function useWorkspaceEvents(
  /** Refresh current application data. */
  onChange: () => void,
): void {
  useEffect(() => {
    if (typeof WebSocket === "undefined") return
    return subscribeToWorkspaceChanges(onChange)
  }, [onChange])
}
