/**
 * Protocol type definitions for beads-ui WebSocket communication.
 *
 * Conventions:
 * - All messages are JSON objects.
 * - Client → Server uses RequestEnvelope.
 * - Server → Client uses ReplyEnvelope.
 * - Every request is correlated by `id` in replies.
 * - Server can also send unsolicited events (e.g., subscription `snapshot`).
 */

/**
 * All supported message types in the WebSocket protocol.
 */
export type MessageType =
  | "list-issues"
  | "update-status"
  | "edit-text"
  | "update-priority"
  | "create-issue"
  | "list-ready"
  | "dep-add"
  | "dep-remove"
  | "epic-status"
  | "update-assignee"
  | "label-add"
  | "label-remove"
  | "subscribe-list"
  | "unsubscribe-list"
  | "snapshot"
  | "upsert"
  | "delete"
  | "get-comments"
  | "add-comment"
  | "delete-issue"
  | "list-workspaces"
  | "set-workspace"
  | "get-workspace"
  | "workspace-changed"
  | "ping"

/**
 * Request envelope sent from client to server.
 */
export interface RequestEnvelope {
  /** Unique id to correlate request/response. */
  id: string
  /** Message type. */
  type: MessageType
  /** Message payload. */
  payload?: unknown
}

/**
 * Error object returned in failed replies.
 */
export interface ErrorObject {
  /** Stable error code. */
  code: string
  /** Human-readable message. */
  message: string
  /** Optional extra info for debugging. */
  details?: unknown
}

/**
 * Reply envelope sent from server to client.
 */
export interface ReplyEnvelope {
  /** Correlates to the originating request. */
  id: string
  /** True when request succeeded; false on error. */
  ok: boolean
  /** Echoes request type (or event type). */
  type: MessageType
  /** Response payload. */
  payload?: unknown
  /** Present when ok=false. */
  error?: ErrorObject
}
