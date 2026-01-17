/**
 * Shared sort comparators for issues lists.
 * Centralizes sorting so views and stores stay consistent.
 */

import type { IssueLite, IssueLiteComparator } from "../../types/index.js"

/**
 * Compare by priority asc, then created_at asc, then id asc.
 */
export const cmpPriorityThenCreated: IssueLiteComparator = (a: IssueLite, b: IssueLite): number => {
  const pa = a.priority ?? 2
  const pb = b.priority ?? 2
  if (pa !== pb) {
    return pa - pb
  }
  const ca = a.created_at ?? 0
  const cb = b.created_at ?? 0
  if (ca !== cb) {
    return ca < cb ? -1 : 1
  }
  const ida = a.id
  const idb = b.id
  return (
    ida < idb ? -1
    : ida > idb ? 1
    : 0
  )
}

/**
 * Compare by closed_at desc, then id asc for stability.
 */
export const cmpClosedDesc: IssueLiteComparator = (a: IssueLite, b: IssueLite): number => {
  const ca = a.closed_at ?? 0
  const cb = b.closed_at ?? 0
  if (ca !== cb) {
    return ca < cb ? 1 : -1
  }
  const ida = a.id
  const idb = b.id
  return (
    ida < idb ? -1
    : ida > idb ? 1
    : 0
  )
}
