/**
 * WebSocket client type definitions.
 *
 * These types define the configuration and state for the persistent
 * WebSocket client with auto-reconnect and message correlation.
 */

import type { MessageType } from "./protocol.js"

/** Connection state for the WebSocket client. */
export type ConnectionState = "connecting" | "open" | "closed" | "reconnecting"

/** Configuration for exponential backoff on reconnect. */
export interface BackoffOptions {
  /** Initial delay in milliseconds (default: 1000). */
  initialMs?: number
  /** Maximum delay in milliseconds (default: 30000). */
  maxMs?: number
  /** Multiplier for exponential growth (default: 2). */
  factor?: number
  /** Jitter ratio (0-1) to randomize delays (default: 0.2). */
  jitterRatio?: number
}

/** Options for creating a WebSocket client. */
export interface ClientOptions {
  /** WebSocket URL; defaults to derived from window.location. */
  url?: string
  /** Backoff configuration for reconnects. */
  backoff?: BackoffOptions
}

/**
 * WebSocket client interface.
 *
 * Provides a promise-based API for request/response communication
 * with auto-reconnect and event handling for server-pushed messages.
 */
export interface WsClient {
  /**
   * Send a request and await its correlated reply payload.
   *
   * @param type - Message type
   * @param payload - Optional message payload
   * @returns Promise resolving to the reply payload
   */
  send(type: MessageType, payload?: unknown): Promise<unknown>

  /**
   * Register a handler for a server-initiated event type.
   *
   * @param type - Message type to listen for
   * @param handler - Callback for received events
   * @returns Unsubscribe function
   */
  on(type: MessageType, handler: (payload: unknown) => void): () => void

  /**
   * Subscribe to connection state changes.
   *
   * @param handler - Callback for state changes
   * @returns Unsubscribe function
   */
  onConnection(handler: (state: ConnectionState) => void): () => void

  /** Close the connection and stop reconnecting. */
  close(): void

  /** Get current connection state. */
  getState(): ConnectionState
}
