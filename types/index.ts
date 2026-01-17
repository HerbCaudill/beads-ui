/**
 * Central type definitions for beads-ui.
 *
 * This module re-exports all shared types used by both the frontend (app/)
 * and backend (server/) code. Import from here for convenience:
 *
 *   import type { Issue, MessageType, WsClient } from '../types/index.js'
 */

// Issue-related types
export type {
  Comment,
  DependencyRef,
  Issue,
  IssueDetail,
  IssueRef,
  NormalizedIssue,
} from "./issues.js"

// Protocol types for WebSocket communication
export type { ErrorObject, MessageType, ReplyEnvelope, RequestEnvelope } from "./protocol.js"

// WebSocket client types
export type { BackoffOptions, ClientOptions, ConnectionState, WsClient } from "./ws-client.js"

// Subscription protocol types
export type {
  ClientMessage,
  DeleteMessage,
  ErrorMessage,
  ServerMessage,
  SnapshotMessage,
  SubscribeMessage,
  SubscribeParamsBase,
  SubscriptionRegistryEntry,
  SubscriptionType,
  UnsubscribeMessage,
  UpsertMessage,
} from "./subscriptions.js"

// Subscription store types
export type {
  CreateSubscriptionIssueStore,
  DeleteMsg,
  IssueComparator,
  SnapshotMsg,
  SubscriptionIssueStore,
  SubscriptionIssueStoreOptions,
  UpsertMsg,
} from "./subscription-issue-store.js"

// List adapter types
export type {
  FetchListResult,
  FetchListResultFailure,
  FetchListResultSuccess,
  SubscriptionSpec,
} from "./list-adapters.js"
