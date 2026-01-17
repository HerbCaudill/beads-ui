/**
 * Protocol definitions for beads-ui WebSocket communication.
 *
 * Conventions
 * - All messages are JSON objects.
 * - Client -> Server uses RequestEnvelope.
 * - Server -> Client uses ReplyEnvelope.
 * - Every request is correlated by `id` in replies.
 * - Server can also send unsolicited events (e.g., subscription `snapshot`).
 */

import type { MessageType, RequestEnvelope, ReplyEnvelope, ErrorObject } from "../types/protocol.js"

// Re-export types for consumers
export type { MessageType, RequestEnvelope, ReplyEnvelope, ErrorObject }

/**
 * All supported message types.
 */
export const MESSAGE_TYPES = [
  "list-issues",
  "update-status",
  "edit-text",
  "update-priority",
  "create-issue",
  "list-ready",
  "dep-add",
  "dep-remove",
  "epic-status",
  "update-assignee",
  "label-add",
  "label-remove",
  "subscribe-list",
  "unsubscribe-list",
  // vNext per-subscription full-issue push events
  "snapshot",
  "upsert",
  "delete",
  // Comments
  "get-comments",
  "add-comment",
  // Delete issue
  "delete-issue",
  // Workspace management
  "list-workspaces",
  "set-workspace",
  "get-workspace",
  "workspace-changed",
  // Heartbeat
  "ping",
] as const satisfies readonly MessageType[]

/**
 * Generate a lexically sortable request id.
 */
export function nextId(): string {
  const now = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${now}-${rand}`
}

/**
 * Create a request envelope.
 *
 * @param type - Message type.
 * @param payload - Message payload.
 * @param id - Optional id; generated if omitted.
 */
export function makeRequest(
  type: MessageType,
  payload?: unknown,
  id: string = nextId(),
): RequestEnvelope {
  return { id, type, payload }
}

/**
 * Create a successful reply envelope for a given request.
 *
 * @param req - Original request.
 * @param payload - Reply payload.
 */
export function makeOk(req: RequestEnvelope, payload?: unknown): ReplyEnvelope {
  return { id: req.id, ok: true, type: req.type, payload }
}

/**
 * Create an error reply envelope for a given request.
 *
 * @param req - Original request.
 * @param code - Error code.
 * @param message - Human-readable error message.
 * @param details - Optional extra debugging info.
 */
export function makeError(
  req: RequestEnvelope,
  code: string,
  message: string,
  details?: unknown,
): ReplyEnvelope {
  return {
    id: req.id,
    ok: false,
    type: req.type,
    error: { code, message, details },
  }
}

/**
 * Check if a value is a plain object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/**
 * Type guard for MessageType values.
 */
export function isMessageType(value: unknown): value is MessageType {
  return typeof value === "string" && MESSAGE_TYPES.includes(value as MessageType)
}

/**
 * Type guard for RequestEnvelope.
 */
export function isRequest(value: unknown): value is RequestEnvelope {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    (value.payload === undefined || "payload" in value)
  )
}

/**
 * Type guard for ReplyEnvelope.
 */
export function isReply(value: unknown): value is ReplyEnvelope {
  if (!isRecord(value)) {
    return false
  }
  if (typeof value.id !== "string" || typeof value.ok !== "boolean" || !isMessageType(value.type)) {
    return false
  }
  if (value.ok === false) {
    const err = value.error
    if (!isRecord(err) || typeof err.code !== "string" || typeof err.message !== "string") {
      return false
    }
  }
  return true
}

/**
 * Normalize and validate an incoming JSON value as a RequestEnvelope.
 * Throws a user-friendly error if invalid.
 */
export function decodeRequest(json: unknown): RequestEnvelope {
  if (!isRequest(json)) {
    throw new Error("Invalid request envelope")
  }
  return json
}

/**
 * Normalize and validate an incoming JSON value as a ReplyEnvelope.
 */
export function decodeReply(json: unknown): ReplyEnvelope {
  if (!isReply(json)) {
    throw new Error("Invalid reply envelope")
  }
  return json
}
