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
 * Factory for list selectors.
 *
 * Source of truth is per-subscription stores providing snapshots for a given
 * client id. Central issues store fallback has been removed.
 */
export function createListSelectors(issue_stores?: IssueStores): ListSelectors {
  // Sorting comparators are centralized in app/data/sort.js

  /**
   * Get entities for a subscription id with Issues List sort (priority asc → created asc).
   */
  function selectIssuesFor(client_id: string): IssueLite[] {
    if (!issue_stores || typeof issue_stores.snapshotFor !== "function") {
      return []
    }
    return issue_stores.snapshotFor(client_id).slice().sort(cmpPriorityThenCreated)
  }

  /**
   * Get entities for a Board column with column-specific sort.
   */
  function selectBoardColumn(client_id: string, mode: BoardColumnMode): IssueLite[] {
    const arr =
      issue_stores && issue_stores.snapshotFor ? issue_stores.snapshotFor(client_id).slice() : []
    if (mode === "in_progress") {
      arr.sort(cmpPriorityThenCreated)
    } else if (mode === "closed") {
      arr.sort(cmpClosedDesc)
    } else {
      // ready/blocked share the same sort
      arr.sort(cmpPriorityThenCreated)
    }
    return arr
  }

  /**
   * Get children for an epic subscribed as client id `epic:${id}`.
   * Sorted as Issues List (priority asc → created asc).
   */
  function selectEpicChildren(epic_id: string): IssueLite[] {
    if (!issue_stores || typeof issue_stores.snapshotFor !== "function") {
      return []
    }
    // Epic detail subscription uses client id `detail:<id>` and contains the
    // epic entity with a `dependents` array. Render children from that list.
    const arr = issue_stores.snapshotFor(`detail:${epic_id}`) as EpicDetailIssue[]
    const epic = arr.find(it => String(it?.id || "") === String(epic_id))
    const dependents = Array.isArray(epic?.dependents) ? epic.dependents : []
    return (dependents as IssueLite[]).slice().sort(cmpPriorityThenCreated)
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
