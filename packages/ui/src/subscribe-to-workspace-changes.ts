import type { WorkspaceSocketFactory } from "./types.js"

/** Subscribe to server notifications that workspace data changed. */
export function subscribeToWorkspaceChanges(
  /** Refresh application data after a change. */
  onChange: () => void,
  /** Socket factory, injected in tests. */
  createSocket: WorkspaceSocketFactory = (url) => new WebSocket(url),
): () => void {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const socket = createSocket(`${protocol}//${window.location.host}/api/events`)
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data) as { readonly type?: unknown }
      if (message.type === "workspace_changed") onChange()
    } catch {
      // Ignore unrelated or malformed event payloads.
    }
  })

  return () => socket.close()
}
