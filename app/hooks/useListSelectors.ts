/**
 * React hook for accessing list selectors.
 *
 * Wraps list-selectors with useSyncExternalStore for efficient React rendering.
 * Allows main.tsx to inject the instance so React components can access
 * filtered/sorted data.
 */
import { useSyncExternalStore, useCallback } from "react"

import type { IssueLite } from "../../types/issues.js"
import type { ListSelectors, BoardColumnMode } from "../data/list-selectors.js"

/** Module-level reference to the list selectors instance. */
let selectorsInstance: ListSelectors | null = null

/**
 * Set the list selectors instance.
 *
 * Called by main.tsx after creating the selectors. This allows React
 * components to access filtered/sorted data.
 *
 * @param selectors - The list selectors instance.
 */
export function setListSelectorsInstance(selectors: ListSelectors): void {
  selectorsInstance = selectors
}

/**
 * Get the current selectors instance (for testing).
 *
 * @returns The current selectors instance or null.
 */
export function getListSelectorsInstance(): ListSelectors | null {
  return selectorsInstance
}

/**
 * Clear the selectors instance (for testing).
 */
export function clearListSelectorsInstance(): void {
  selectorsInstance = null
}

/**
 * Empty snapshot for when the selectors are not available.
 */
const EMPTY_SNAPSHOT: readonly IssueLite[] = Object.freeze([])

/**
 * Hook to get sorted issues for a specific subscription client ID.
 *
 * Uses useSyncExternalStore for efficient React updates when the underlying data changes.
 * Returns issues sorted by priority (ascending) then created_at (ascending).
 *
 * @param client_id - The subscription client ID (e.g., "tab:issues").
 * @returns Read-only array of sorted issues for the subscription.
 */
export function useIssuesFor(client_id: string): readonly IssueLite[] {
  const subscribe = useCallback(
    (on_store_change: () => void): (() => void) => {
      if (!selectorsInstance) {
        return () => {}
      }
      return selectorsInstance.subscribe(on_store_change)
    },
    [], // Selectors instance is stable
  )

  const getSnapshot = useCallback((): readonly IssueLite[] => {
    if (!selectorsInstance) {
      return EMPTY_SNAPSHOT
    }
    return selectorsInstance.selectIssuesFor(client_id)
  }, [client_id])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to get sorted issues for a board column.
 *
 * Uses useSyncExternalStore for efficient React updates when the underlying data changes.
 * Returns issues sorted according to the column mode:
 * - ready/blocked/in_progress: priority (ascending) then created_at (ascending)
 * - closed: closed_at (descending)
 *
 * @param client_id - The subscription client ID (e.g., "tab:board:ready").
 * @param mode - The board column mode.
 * @returns Read-only array of sorted issues for the board column.
 */
export function useBoardColumn(client_id: string, mode: BoardColumnMode): readonly IssueLite[] {
  const subscribe = useCallback(
    (on_store_change: () => void): (() => void) => {
      if (!selectorsInstance) {
        return () => {}
      }
      return selectorsInstance.subscribe(on_store_change)
    },
    [], // Selectors instance is stable
  )

  const getSnapshot = useCallback((): readonly IssueLite[] => {
    if (!selectorsInstance) {
      return EMPTY_SNAPSHOT
    }
    return selectorsInstance.selectBoardColumn(client_id, mode)
  }, [client_id, mode])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to get sorted children for an epic.
 *
 * Uses useSyncExternalStore for efficient React updates when the underlying data changes.
 * Returns children sorted by priority (ascending) then created_at (ascending).
 *
 * @param epic_id - The epic issue ID.
 * @returns Read-only array of sorted children for the epic.
 */
export function useEpicChildren(epic_id: string): readonly IssueLite[] {
  const subscribe = useCallback(
    (on_store_change: () => void): (() => void) => {
      if (!selectorsInstance) {
        return () => {}
      }
      return selectorsInstance.subscribe(on_store_change)
    },
    [], // Selectors instance is stable
  )

  const getSnapshot = useCallback((): readonly IssueLite[] => {
    if (!selectorsInstance) {
      return EMPTY_SNAPSHOT
    }
    return selectorsInstance.selectEpicChildren(epic_id)
  }, [epic_id])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Hook to check if the list selectors are available.
 *
 * Useful for components that need to conditionally render based on data availability.
 *
 * @returns True if the selectors have been initialized.
 */
export function useListSelectorsAvailable(): boolean {
  const subscribe = useCallback((_on_store_change: () => void): (() => void) => {
    // Selectors instance doesn't change after init, so no subscription needed
    return () => {}
  }, [])

  const getSnapshot = useCallback((): boolean => {
    return selectorsInstance !== null
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
