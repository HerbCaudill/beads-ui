/**
 * List selectors utility: compose subscription membership with issues entities
 * and apply view-specific sorting. Provides a lightweight `subscribe` that
 * triggers once per issues envelope to let views re-render.
 */

import type { IssueLite, DependencyRef } from "../../types/index.js"
import { cmpClosedDesc, cmpPriorityThenCreated } from "./sort.js"

/**
 * Board column mode type.
 */
export type BoardColumnMode = "ready" | "blocked" | "in_progress" | "closed"

/**
 * Issue stores interface for list selectors.
 * Provides snapshot access and subscription capabilities.
 */
export interface IssueStores {
  snapshotFor?: (client_id: string) => IssueLite[]
  subscribe?: (fn: () => void) => () => void
}

/**
 * List selectors interface returned by createListSelectors.
 */
export interface ListSelectors {
  selectIssuesFor: (client_id: string) => IssueLite[]
  selectBoardColumn: (client_id: string, mode: BoardColumnMode) => IssueLite[]
  selectEpicChildren: (epic_id: string) => IssueLite[]
  subscribe: (fn: () => void) => () => void
}

/**
 * Extended issue type for epic detail with dependents array.
 */
interface EpicDetailIssue {
  id?: string
  dependents?: DependencyRef[]
}

/**
 * Cache entry for memoization.
 */
interface CacheEntry<T> {
  source: T[]
  sorted: T[]
}

/**
 * Factory for list selectors.
 *
 * Source of truth is per-subscription stores providing snapshots for a given
 * client id. Central issues store fallback has been removed.
 *
 * Uses memoization caches to preserve array reference equality when the
 * underlying data hasn't changed, preventing infinite re-renders with
 * useSyncExternalStore.
 */
export function createListSelectors(issue_stores?: IssueStores): ListSelectors {
  // Sorting comparators are centralized in app/data/sort.js

  // Memoization caches to preserve reference equality
  /** @type {Map<string, CacheEntry<IssueLite>>} */
  const issues_cache = new Map<string, CacheEntry<IssueLite>>()
  /** @type {Map<string, CacheEntry<IssueLite>>} */
  const board_cache = new Map<string, CacheEntry<IssueLite>>()
  /** @type {Map<string, CacheEntry<IssueLite>>} */
  const epic_cache = new Map<string, CacheEntry<IssueLite>>()

  /** Empty array singleton for stable reference. */
  const EMPTY: IssueLite[] = []

  /**
   * Get entities for a subscription id with Issues List sort (priority asc → created asc).
   *
   * @param client_id - The subscription client ID.
   * @returns Sorted issues array with stable reference.
   */
  function selectIssuesFor(client_id: string): IssueLite[] {
    if (!issue_stores || typeof issue_stores.snapshotFor !== "function") {
      return EMPTY
    }
    const source = issue_stores.snapshotFor(client_id)
    const cached = issues_cache.get(client_id)
    if (cached && cached.source === source) {
      return cached.sorted
    }
    const sorted = source.slice().sort(cmpPriorityThenCreated)
    issues_cache.set(client_id, { source, sorted })
    return sorted
  }

  /**
   * Get entities for a Board column with column-specific sort.
   *
   * @param client_id - The subscription client ID.
   * @param mode - The board column mode.
   * @returns Sorted issues array with stable reference.
   */
  function selectBoardColumn(client_id: string, mode: BoardColumnMode): IssueLite[] {
    if (!issue_stores || typeof issue_stores.snapshotFor !== "function") {
      return EMPTY
    }
    const cache_key = `${client_id}:${mode}`
    const source = issue_stores.snapshotFor(client_id)
    const cached = board_cache.get(cache_key)
    if (cached && cached.source === source) {
      return cached.sorted
    }
    const arr = source.slice()
    if (mode === "in_progress") {
      arr.sort(cmpPriorityThenCreated)
    } else if (mode === "closed") {
      arr.sort(cmpClosedDesc)
    } else {
      // ready/blocked share the same sort
      arr.sort(cmpPriorityThenCreated)
    }
    board_cache.set(cache_key, { source, sorted: arr })
    return arr
  }

  /**
   * Get children for an epic subscribed as client id `epic:${id}`.
   * Sorted as Issues List (priority asc → created asc).
   *
   * @param epic_id - The epic issue ID.
   * @returns Sorted children array with stable reference.
   */
  function selectEpicChildren(epic_id: string): IssueLite[] {
    if (!issue_stores || typeof issue_stores.snapshotFor !== "function") {
      return EMPTY
    }
    // Epic detail subscription uses client id `detail:<id>` and contains the
    // epic entity with a `dependents` array. Render children from that list.
    const source = issue_stores.snapshotFor(`detail:${epic_id}`) as EpicDetailIssue[]
    const cached = epic_cache.get(epic_id)
    if (cached && (cached.source as unknown) === (source as unknown)) {
      return cached.sorted
    }
    const epic = source.find(it => String(it?.id || "") === String(epic_id))
    const dependents = Array.isArray(epic?.dependents) ? epic.dependents : []
    const sorted = (dependents as IssueLite[]).slice().sort(cmpPriorityThenCreated)
    epic_cache.set(epic_id, { source: source as unknown as IssueLite[], sorted })
    return sorted
  }

  /**
   * Subscribe for re-render; triggers once per issues envelope.
   */
  function subscribe(fn: () => void): () => void {
    if (issue_stores && typeof issue_stores.subscribe === "function") {
      return issue_stores.subscribe(fn)
    }
    return () => {}
  }

  return {
    selectIssuesFor,
    selectBoardColumn,
    selectEpicChildren,
    subscribe,
  }
}
