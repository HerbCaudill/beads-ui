/**
 * Registry managing per-subscription issue stores. Stores receive full-issue
 * push envelopes (snapshot/upsert/delete) per subscription id and expose
 * read-only snapshots for rendering.
 */

import type { IssueLite } from "../../types/issues.js"
import type {
  SubscriptionIssueStore,
  SubscriptionIssueStoreOptions,
} from "../../types/subscription-issue-store.js"
import { debug } from "../utils/logging.js"
import { createSubscriptionIssueStore } from "./subscription-issue-store.js"
import { subKeyOf } from "./subscriptions-store.js"

/**
 * Subscription spec used for computing a stable key.
 */
interface SubscriptionSpec {
  type: string
  params?: Record<string, string | number | boolean>
}

/**
 * Interface for the subscription issue stores registry.
 */
export interface SubscriptionIssueStoresRegistry {
  /**
   * Ensure a store exists for client_id and attach a listener that fans out
   * store-level updates to global listeners.
   */
  register: (
    clientId: string,
    spec?: SubscriptionSpec,
    options?: SubscriptionIssueStoreOptions,
  ) => () => void

  /**
   * Unregister a client and dispose its store.
   */
  unregister: (clientId: string) => void

  /**
   * Get the store for a client id, or null if not registered.
   */
  getStore: (clientId: string) => SubscriptionIssueStore | null

  /**
   * Get a snapshot of issues for a client id. Returns a shallow copy of the array.
   */
  snapshotFor: (clientId: string) => IssueLite[]

  /**
   * Subscribe to any store change. Listener is invoked after each applied message
   * exactly once, regardless of how many items changed. Returns an unsubscribe function.
   */
  subscribe: (fn: () => void) => () => void
}

/**
 * Create a subscription issue stores registry.
 */
export function createSubscriptionIssueStores(): SubscriptionIssueStoresRegistry {
  const log = debug("issue-stores")
  const storesById = new Map<string, SubscriptionIssueStore>()
  const keyById = new Map<string, string>()
  const listeners = new Set<() => void>()
  const storeUnsubs = new Map<string, () => void>()

  function emit(): void {
    for (const fn of Array.from(listeners)) {
      try {
        fn()
      } catch {
        // ignore
      }
    }
  }

  /**
   * Ensure a store exists for client_id and attach a listener that fans out
   * store-level updates to global listeners.
   */
  function register(
    clientId: string,
    spec?: SubscriptionSpec,
    options?: SubscriptionIssueStoreOptions,
  ): () => void {
    const nextKey = spec ? subKeyOf(spec) : ""
    const prevKey = keyById.get(clientId) || ""
    const hasStore = storesById.has(clientId)
    log("register %s key=%s (prev=%s)", clientId, nextKey, prevKey)
    // If the subscription spec changed for an existing client id, replace the
    // underlying store to reset revision state and avoid ignoring a fresh
    // snapshot with a lower revision (different server list).
    if (hasStore && prevKey && nextKey && prevKey !== nextKey) {
      const prevStore = storesById.get(clientId)
      if (prevStore) {
        try {
          prevStore.dispose()
        } catch {
          // ignore
        }
      }
      const offPrev = storeUnsubs.get(clientId)
      if (offPrev) {
        try {
          offPrev()
        } catch {
          // ignore
        }
        storeUnsubs.delete(clientId)
      }
      const newStore = createSubscriptionIssueStore(clientId, options)
      storesById.set(clientId, newStore)
      const offNew = newStore.subscribe(() => emit())
      storeUnsubs.set(clientId, offNew)
    } else if (!hasStore) {
      const store = createSubscriptionIssueStore(clientId, options)
      storesById.set(clientId, store)
      // Fan out per-store events to global subscribers
      const off = store.subscribe(() => emit())
      storeUnsubs.set(clientId, off)
    }
    keyById.set(clientId, nextKey)
    return () => unregister(clientId)
  }

  function unregister(clientId: string): void {
    log("unregister %s", clientId)
    keyById.delete(clientId)
    const store = storesById.get(clientId)
    if (store) {
      store.dispose()
      storesById.delete(clientId)
    }
    const off = storeUnsubs.get(clientId)
    if (off) {
      try {
        off()
      } catch {
        // ignore
      }
      storeUnsubs.delete(clientId)
    }
  }

  return {
    register,
    unregister,
    getStore(clientId: string): SubscriptionIssueStore | null {
      return storesById.get(clientId) || null
    },
    snapshotFor(clientId: string): IssueLite[] {
      const s = storesById.get(clientId)
      return s ? (s.snapshot().slice() as IssueLite[]) : []
    },
    subscribe(fn: () => void): () => void {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    // No recompute helpers in vNext; stores are updated directly via push
  }
}
