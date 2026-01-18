/**
 * React hook for accessing subscription issue stores.
 *
 * Wraps the subscription-issue-stores registry with useSyncExternalStore
 * for efficient React rendering. Allows main.tsx to inject the instance
 * so React components can access the shared data stores.
 */
import { useSyncExternalStore, useCallback } from "react"

import type { Issue, IssueLite } from "../../types/issues.js"
import type { SubscriptionIssueStoresRegistry } from "../data/subscription-issue-stores.js"

/** Module-level reference to the stores registry instance. */
let registryInstance: SubscriptionIssueStoresRegistry | null = null

/**
 * Set the subscription issue stores registry instance.
 *
 * Called by main.tsx after creating the registry. This allows React
 * components to access the shared data stores.
 *
 * @param registry - The subscription issue stores registry instance.
 */
export function setIssueStoresInstance(registry: SubscriptionIssueStoresRegistry): void {
  registryInstance = registry
}

/**
 * Get the current registry instance (for testing).
 *
 * @returns The current registry instance or null.
 */
export function getIssueStoresInstance(): SubscriptionIssueStoresRegistry | null {
  return registryInstance
}

/**
 * Clear the registry instance (for testing).
 */
export function clearIssueStoresInstance(): void {
  registryInstance = null
}

/**
 * Empty snapshot for when the registry is not available or subscription not found.
 */
const EMPTY_SNAPSHOT: readonly Issue[] = Object.freeze([])

/**
 * Hook to subscribe to issues for a specific subscription client ID.
 *
 * Uses useSyncExternalStore for efficient React updates when the store changes.
 * Returns a stable snapshot of issues that updates when the subscription data changes.
 *
 * @param client_id - The subscription client ID (e.g., "tab:issues", "detail:bui-123").
 * @returns Read-only array of issues for the subscription.
 */
export function useIssueStore(client_id: string): readonly Issue[] {
  const subscribe = useCallback(
    (on_store_change: () => void): (() => void) => {
      if (!registryInstance) {
        return () => {}
      }
      return registryInstance.subscribe(on_store_change)
    },
    [], // Registry instance is stable
  )

  const getSnapshot = useCallback((): readonly Issue[] => {
    if (!registryInstance) {
      return EMPTY_SNAPSHOT
    }
    const store = registryInstance.getStore(client_id)
    if (!store) {
      return EMPTY_SNAPSHOT
    }
    return store.snapshot()
  }, [client_id])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to get a single issue by ID from a subscription store.
 *
 * @param client_id - The subscription client ID.
 * @param issue_id - The ID of the issue to retrieve.
 * @returns The issue if found, undefined otherwise.
 */
export function useIssue(client_id: string, issue_id: string): Issue | undefined {
  const subscribe = useCallback((on_store_change: () => void): (() => void) => {
    if (!registryInstance) {
      return () => {}
    }
    return registryInstance.subscribe(on_store_change)
  }, [])

  const getSnapshot = useCallback((): Issue | undefined => {
    if (!registryInstance) {
      return undefined
    }
    const store = registryInstance.getStore(client_id)
    if (!store) {
      return undefined
    }
    return store.getById(issue_id)
  }, [client_id, issue_id])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to check if the registry is available.
 *
 * Useful for components that need to conditionally render based on data availability.
 *
 * @returns True if the registry has been initialized.
 */
export function useIssueStoresAvailable(): boolean {
  const subscribe = useCallback((_on_store_change: () => void): (() => void) => {
    // Registry instance doesn't change after init, so no subscription needed
    return () => {}
  }, [])

  const getSnapshot = useCallback((): boolean => {
    return registryInstance !== null
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to get the snapshot as IssueLite for list views.
 *
 * This is a convenience wrapper that returns the same data as useIssueStore
 * but typed as IssueLite[] for use in list components.
 *
 * @param client_id - The subscription client ID.
 * @returns Read-only array of issues for the subscription.
 */
export function useIssueStoreLite(client_id: string): readonly IssueLite[] {
  return useIssueStore(client_id) as readonly IssueLite[]
}
