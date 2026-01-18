/**
 * React hook for accessing the WebSocket transport function.
 *
 * Provides React components with the ability to send WebSocket messages.
 * The transport instance is injected from main-lit.ts so React components
 * can communicate with the server using the same transport as lit-html views.
 */
import { useCallback } from "react"

import type { MessageType } from "../protocol.js"

/**
 * Transport function signature for sending messages to the server.
 */
export type TransportFn = (type: MessageType, payload?: unknown) => Promise<unknown>

/** Module-level reference to the transport function instance. */
let transportInstance: TransportFn | null = null

/**
 * Set the transport function instance.
 *
 * Called by main-lit.ts after creating the WebSocket client and transport.
 * This allows React components to send messages using the same transport
 * as lit-html views.
 *
 * @param transport - The transport function instance.
 */
export function setTransportInstance(transport: TransportFn): void {
  transportInstance = transport
}

/**
 * Get the current transport instance (for testing).
 *
 * @returns The current transport instance or null.
 */
export function getTransportInstance(): TransportFn | null {
  return transportInstance
}

/**
 * Clear the transport instance (for testing).
 */
export function clearTransportInstance(): void {
  transportInstance = null
}

/**
 * Hook to get the transport send function.
 *
 * Returns a stable send function that can be used to send WebSocket messages.
 * If the transport is not available, the send function returns a rejected promise.
 *
 * @returns A function to send messages via WebSocket.
 */
export function useTransport(): TransportFn {
  const send = useCallback(async (type: MessageType, payload?: unknown): Promise<unknown> => {
    if (!transportInstance) {
      return Promise.reject(new Error("Transport not available"))
    }
    return transportInstance(type, payload)
  }, [])

  return send
}

/**
 * Hook to check if the transport is available.
 *
 * Useful for components that need to conditionally render based on
 * transport availability.
 *
 * @returns True if the transport has been initialized.
 */
export function useTransportAvailable(): boolean {
  return transportInstance !== null
}
