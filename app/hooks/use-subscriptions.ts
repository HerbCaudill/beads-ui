/**
 * React hook for managing WebSocket subscriptions.
 *
 * Provides React components with the ability to subscribe to server-side lists.
 * The subscription store and issue stores instances are injected from main-bootstrap.ts.
 */
import { useCallback, useEffect, useRef } from "react"

import type { SubscriptionSpec } from "../../types/list-adapters.js"
import type { SubscriptionStore } from "../data/subscriptions-store.js"
import type { SubscriptionIssueStoresRegistry } from "../data/subscription-issue-stores.js"

/** Module-level reference to the subscription store instance. */
let subscriptionsInstance: SubscriptionStore | null = null

/** Module-level reference to the issue stores registry instance. */
let issueStoresRegistryInstance: SubscriptionIssueStoresRegistry | null = null

/**
 * Set the subscription store instance.
 *
 * Called by main-bootstrap.ts after creating the subscription store. This allows
 * React components to subscribe to server-side lists.
 *
 * @param store - The subscription store instance.
 */
export function setSubscriptionsInstance(store: SubscriptionStore): void {
  subscriptionsInstance = store
}

/**
 * Get the current subscriptions instance (for testing).
 */
export function getSubscriptionsInstance(): SubscriptionStore | null {
  return subscriptionsInstance
}

/**
 * Clear the subscriptions instance (for testing).
 */
export function clearSubscriptionsInstance(): void {
  subscriptionsInstance = null
}

/**
 * Set the issue stores registry instance for subscriptions.
 *
 * Called by main-bootstrap.ts after creating the registry. This allows
 * React components to register/unregister stores when subscribing.
 *
 * @param registry - The issue stores registry instance.
 */
export function setIssueStoresRegistryInstance(registry: SubscriptionIssueStoresRegistry): void {
  issueStoresRegistryInstance = registry
}

/**
 * Get the current issue stores registry instance (for testing).
 */
export function getIssueStoresRegistryInstance(): SubscriptionIssueStoresRegistry | null {
  return issueStoresRegistryInstance
}

/**
 * Clear the issue stores registry instance (for testing).
 */
export function clearIssueStoresRegistryInstance(): void {
  issueStoresRegistryInstance = null
}

/**
 * Hook to subscribe to a server-side list.
 *
 * Automatically registers the issue store, subscribes to the list, and cleans up
 * when the component unmounts or the subscription parameters change.
 *
 * @param client_id - The subscription client ID (e.g., "detail:UI-123").
 * @param spec - The subscription specification.
 * @param enabled - Whether the subscription is enabled.
 */
export function useSubscription(
  client_id: string,
  spec: SubscriptionSpec,
  enabled: boolean = true,
): void {
  const unsub_ref = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (!enabled || !client_id || !subscriptionsInstance || !issueStoresRegistryInstance) {
      return
    }

    // Register the issue store first to capture the initial snapshot
    try {
      issueStoresRegistryInstance.register(client_id, spec)
    } catch {
      // ignore registration failures
    }

    // Subscribe to the server-side list
    void subscriptionsInstance
      .subscribeList(client_id, spec)
      .then(unsub => {
        unsub_ref.current = unsub
      })
      .catch(() => {
        // ignore subscription failures
      })

    // Cleanup on unmount or when dependencies change
    return () => {
      if (unsub_ref.current) {
        void unsub_ref.current().catch(() => {})
        unsub_ref.current = null
      }
      try {
        issueStoresRegistryInstance?.unregister(client_id)
      } catch {
        // ignore unregistration failures
      }
    }
  }, [client_id, spec.type, JSON.stringify(spec.params), enabled])
}

/**
 * Hook to check if subscriptions are available.
 */
export function useSubscriptionsAvailable(): boolean {
  return subscriptionsInstance !== null && issueStoresRegistryInstance !== null
}
