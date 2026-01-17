/**
 * Subscription protocol type definitions (interfaces only).
 * File is .ts by design: interface definitions only.
 */

// Re-export shared issue types for backwards compatibility
export type { DependencyRef, Issue, IssueRef } from "./issues.js"
import type { Issue, IssueRef } from "./issues.js"

export type SubscriptionType =
  | "all-issues"
  | "epics"
  | "blocked-issues"
  | "ready-issues"
  | "in-progress-issues"
  | "closed-issues"
  | "issue-detail"

export interface SubscribeParamsBase {
  /** Client-chosen subscription id (unique per connection). */
  id: string
  /** Type of list to subscribe to. */
  type: SubscriptionType
  /** Optional parameters for the list, e.g., epic_id or filters. */
  params?: Record<string, unknown>
}

export interface SubscribeMessage extends SubscribeParamsBase {
  kind: "subscribe"
}

export interface UnsubscribeMessage {
  kind: "unsubscribe"
  id: string
}

// Mutation messages are explicit and defined elsewhere in the protocol.
// There is no generic "mutate" command pipe from clients.

export type ClientMessage = SubscribeMessage | UnsubscribeMessage

export interface SnapshotMessage {
  kind: "snapshot"
  id: string // client subscription id
  revision: number // strictly increasing per subscription
  issues: Issue[]
}

export interface UpsertMessage {
  kind: "upsert"
  id: string
  revision: number
  issue: Issue
}

export interface DeleteMessage {
  kind: "delete"
  id: string
  revision: number
  issue_id: string
}

export interface ErrorMessage {
  kind: "error"
  id?: string
  code: string
  message: string
  details?: Record<string, unknown>
}

export type ServerMessage = SnapshotMessage | UpsertMessage | DeleteMessage | ErrorMessage

export interface SubscriptionRegistryEntry {
  /** Deterministic key: type + serialized params */
  key: string
  /** Fast-lookup map for diffing */
  itemsById: Map<string, IssueRef>
  /** Active subscribers (connection-local ids) */
  subscribers: Set<string>
  /** For metrics and observability (not used for TTL/GC) */
  lastRunAt?: number
}
