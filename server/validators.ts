/**
 * Validation helpers for protocol payloads.
 *
 * Provides schema checks for subscription specs and selected mutations.
 */

import type { SubscriptionSpec } from "../types/list-adapters.js"
import type { SubscriptionType } from "../types/subscriptions.js"

/**
 * Known subscription types supported by the server.
 */
const SUBSCRIPTION_TYPES: Set<SubscriptionType> = new Set([
  "all-issues",
  "epics",
  "blocked-issues",
  "ready-issues",
  "in-progress-issues",
  "closed-issues",
  "issue-detail",
])

/**
 * Successful validation result for subscribe-list payload.
 */
export interface ValidateSubscribeListSuccess {
  ok: true
  id: string
  spec: SubscriptionSpec
}

/**
 * Failed validation result for subscribe-list payload.
 */
export interface ValidateSubscribeListFailure {
  ok: false
  code: "bad_request"
  message: string
}

/**
 * Result of validating a subscribe-list payload.
 */
export type ValidateSubscribeListResult =
  | ValidateSubscribeListSuccess
  | ValidateSubscribeListFailure

/**
 * Validate a subscribe-list payload and normalize to a SubscriptionSpec.
 */
export function validateSubscribeListPayload(payload: unknown): ValidateSubscribeListResult {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      code: "bad_request",
      message: "payload must be an object",
    }
  }
  const any = payload as { id?: unknown; type?: unknown; params?: unknown }

  const id = typeof any.id === "string" ? any.id : ""
  if (id.length === 0) {
    return {
      ok: false,
      code: "bad_request",
      message: "payload.id must be a non-empty string",
    }
  }

  const type = typeof any.type === "string" ? any.type : ""
  if (type.length === 0 || !SUBSCRIPTION_TYPES.has(type as SubscriptionType)) {
    return {
      ok: false,
      code: "bad_request",
      message: `payload.type must be one of: ${Array.from(SUBSCRIPTION_TYPES).join(", ")}`,
    }
  }

  let params: Record<string, string | number | boolean> | undefined
  if (any.params !== undefined) {
    if (!any.params || typeof any.params !== "object" || Array.isArray(any.params)) {
      return {
        ok: false,
        code: "bad_request",
        message: "payload.params must be an object when provided",
      }
    }
    params = any.params as Record<string, string | number | boolean>
  }

  // Per-type param schemas
  if (type === "issue-detail") {
    const issue_id = String(params?.id ?? "").trim()
    if (issue_id.length === 0) {
      return {
        ok: false,
        code: "bad_request",
        message: "params.id must be a non-empty string",
      }
    }
    params = { id: issue_id }
  } else if (type === "closed-issues") {
    if (params && "since" in params) {
      const since = params.since
      const n = typeof since === "number" ? since : Number.NaN
      if (!Number.isFinite(n) || n < 0) {
        return {
          ok: false,
          code: "bad_request",
          message: "params.since must be a non-negative number (epoch ms)",
        }
      }
      params = { since: n }
    } else {
      params = undefined
    }
  } else {
    // Other types do not accept params
    if (params && Object.keys(params).length > 0) {
      return {
        ok: false,
        code: "bad_request",
        message: `type ${type} does not accept params`,
      }
    }
    params = undefined
  }

  const spec: SubscriptionSpec = params !== undefined ? { type, params } : { type }
  return { ok: true, id, spec }
}
