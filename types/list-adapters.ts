/**
 * List adapter type definitions.
 *
 * Types for server-side list fetching and subscription handling.
 */

import type { NormalizedIssue } from "./issues.js"

/**
 * Subscription specification passed to list adapters.
 */
export interface SubscriptionSpec {
  type: string
  params?: Record<string, string | number | boolean>
}

/**
 * Successful result from fetching a list subscription.
 */
export interface FetchListResultSuccess {
  ok: true
  items: NormalizedIssue[]
}

/**
 * Failed result from fetching a list subscription.
 */
export interface FetchListResultFailure {
  ok: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Result from fetching a list subscription.
 */
export type FetchListResult = FetchListResultSuccess | FetchListResultFailure
