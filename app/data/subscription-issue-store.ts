/**
 * Per-subscription issue store. Holds full Issue objects and exposes a
 * deterministic, read-only snapshot for rendering. Applies snapshot/upsert/
 * delete messages in revision order and preserves object identity per id.
 */

import type { Issue } from "../../types/issues.js"
import type {
  SubscriptionIssueStore,
  SubscriptionIssueStoreOptions,
  IssueComparator,
  SnapshotMsg,
  UpsertMsg,
  DeleteMsg,
} from "../../types/subscription-issue-store.js"
import { debug } from "../utils/logging.js"
import { cmpPriorityThenCreated } from "./sort.js"

/**
 * Union of all push message types.
 */
type PushMessage = SnapshotMsg | UpsertMsg | DeleteMsg

/**
 * Create a SubscriptionIssueStore for a given subscription id.
 */
export function createSubscriptionIssueStore(
  id: string,
  options: SubscriptionIssueStoreOptions = {},
): SubscriptionIssueStore {
  const log = debug(`issue-store:${id}`)
  const items_by_id = new Map<string, Issue>()
  let ordered: Issue[] = []
  let last_revision = 0
  const listeners = new Set<() => void>()
  let is_disposed = false
  // Cast cmpPriorityThenCreated to IssueComparator since Issue extends the fields it uses
  const sort: IssueComparator = options.sort ?? (cmpPriorityThenCreated as IssueComparator)

  function emit(): void {
    for (const fn of Array.from(listeners)) {
      try {
        fn()
      } catch {
        // ignore listener errors
      }
    }
  }

  function rebuildOrdered(): void {
    ordered = Array.from(items_by_id.values()).sort(sort)
  }

  /**
   * Apply snapshot/upsert/delete in revision order. Snapshots reset state.
   * - Ignore messages with revision <= last_revision (except snapshot which resets first).
   * - Preserve object identity when updating an existing item by mutating
   *   fields in place rather than replacing the object reference.
   */
  function applyPush(msg: PushMessage): void {
    if (is_disposed) {
      return
    }
    if (!msg || msg.id !== id) {
      return
    }
    const rev = Number(msg.revision) || 0
    log("apply %s rev=%d", msg.type, rev)
    // Ignore stale messages for all types, including snapshots
    if (rev <= last_revision && msg.type !== "snapshot") {
      return // stale or duplicate non-snapshot
    }
    if (msg.type === "snapshot") {
      if (rev <= last_revision) {
        return // ignore stale snapshot
      }
      items_by_id.clear()
      const items = Array.isArray(msg.issues) ? msg.issues : []
      for (const it of items) {
        if (it && typeof it.id === "string" && it.id.length > 0) {
          items_by_id.set(it.id, it)
        }
      }
      rebuildOrdered()
      last_revision = rev
      emit()
      return
    }
    if (msg.type === "upsert") {
      const it = msg.issue
      if (it && typeof it.id === "string" && it.id.length > 0) {
        const existing = items_by_id.get(it.id)
        if (!existing) {
          items_by_id.set(it.id, it)
        } else {
          // Guard with updated_at; prefer newer
          const prev_ts = Number.isFinite(existing.updated_at) ? (existing.updated_at as number) : 0
          const next_ts = Number.isFinite(it.updated_at) ? (it.updated_at as number) : 0
          if (prev_ts <= next_ts) {
            // Mutate existing object to preserve reference
            // Mutate via unknown cast to preserve identity
            const target = existing as unknown as Record<string, unknown>
            const source = it as unknown as Record<string, unknown>
            for (const k of Object.keys(target)) {
              if (!(k in source)) {
                // remove keys that disappeared to avoid stale fields
                delete target[k]
              }
            }
            for (const [k, v] of Object.entries(source)) {
              target[k] = v
            }
          } else {
            // stale by timestamp; ignore
          }
        }
        rebuildOrdered()
      }
      last_revision = rev
      emit()
    } else if (msg.type === "delete") {
      const rid = String(msg.issue_id || "")
      if (rid) {
        items_by_id.delete(rid)
        rebuildOrdered()
      }
      last_revision = rev
      emit()
    }
  }

  return {
    id,
    subscribe(fn: () => void): () => void {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    applyPush,
    snapshot(): readonly Issue[] {
      // Return as read-only view; callers must not mutate
      return ordered
    },
    size(): number {
      return items_by_id.size
    },
    getById(xid: string): Issue | undefined {
      return items_by_id.get(xid)
    },
    dispose(): void {
      is_disposed = true
      items_by_id.clear()
      ordered = []
      listeners.clear()
      last_revision = 0
    },
  }
}
