import type { MessageType } from "../protocol.ts"
import { debug } from "../utils/logging.js"

/**
 * Input type for updating an issue.
 * All fields except `id` are optional - only provided fields will be updated.
 */
export interface UpdateIssueInput {
  /** Issue ID (required). */
  id: string
  /** Issue title. */
  title?: string
  /** Acceptance criteria. */
  acceptance?: string
  /** Notes. */
  notes?: string
  /** Design notes. */
  design?: string
  /** Issue status. */
  status?: "open" | "in_progress" | "closed"
  /** Priority level (lower = higher priority). */
  priority?: number
  /** Assignee username. */
  assignee?: string
}

/**
 * Transport function signature for sending messages to the server.
 */
export type Transport = (type: MessageType, payload?: unknown) => Promise<unknown>

/**
 * Data layer interface returned by createDataLayer.
 */
export interface DataLayer {
  /** Update issue fields by dispatching specific mutations. */
  updateIssue: (input: UpdateIssueInput) => Promise<unknown>
}

/**
 * Data layer: typed wrappers around the ws transport for mutations and
 * single-issue fetch. List reads have been removed in favor of push-only
 * stores and selectors (see docs/adr/001-push-only-lists.md).
 *
 * @param transport - Request/response function for WebSocket communication.
 * @returns Data layer with mutation methods.
 */
export function createDataLayer(transport: Transport): DataLayer {
  const log = debug("data")

  /**
   * Update issue fields by dispatching specific mutations.
   * Supported fields: title, acceptance, notes, design, status, priority, assignee.
   * Returns the updated issue on success.
   *
   * @param input - Fields to update on the issue.
   * @returns Promise resolving to the last update result.
   */
  async function updateIssue(input: UpdateIssueInput): Promise<unknown> {
    const { id } = input

    log("updateIssue %s %o", id, Object.keys(input))

    let last: unknown = null
    if (typeof input.title === "string") {
      last = await transport("edit-text", {
        id,
        field: "title",
        value: input.title,
      })
    }
    if (typeof input.acceptance === "string") {
      last = await transport("edit-text", {
        id,
        field: "acceptance",
        value: input.acceptance,
      })
    }
    if (typeof input.notes === "string") {
      last = await transport("edit-text", {
        id,
        field: "notes",
        value: input.notes,
      })
    }
    if (typeof input.design === "string") {
      last = await transport("edit-text", {
        id,
        field: "design",
        value: input.design,
      })
    }
    if (typeof input.status === "string") {
      last = await transport("update-status", {
        id,
        status: input.status,
      })
    }
    if (typeof input.priority === "number") {
      last = await transport("update-priority", {
        id,
        priority: input.priority,
      })
    }
    // type updates are not supported via UI
    if (typeof input.assignee === "string") {
      last = await transport("update-assignee", {
        id,
        assignee: input.assignee,
      })
    }
    log("updateIssue done %s", id)
    return last
  }

  return {
    updateIssue,
  }
}
