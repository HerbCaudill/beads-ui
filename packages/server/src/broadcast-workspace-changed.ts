import { WebSocket, type WebSocketServer } from "ws"

/** Tell every connected browser to refresh workspace data. */
export function broadcastWorkspaceChanged(
  /** WebSocket server containing the connected browser clients. */
  server: WebSocketServer,
): void {
  const message = JSON.stringify({ type: "workspace_changed" })
  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(message)
  })
}
