import type { MessageType } from "../protocol.js"
import { debug } from "./logging.js"

/** Information about an active request for debugging. */
export interface ActiveRequestInfo {
  id: number
  type: string
  elapsed_ms: number
}

/** The activity indicator API returned by createActivityIndicator. */
export interface ActivityIndicator {
  /**
   * Wrap a transport-style send function to track activity.
   */
  wrapSend: <T>(
    fn: (type: MessageType, payload?: unknown) => Promise<T>,
  ) => (type: MessageType, payload?: unknown) => Promise<T>
  /** Manually increment the pending count. */
  start: () => void
  /** Manually decrement the pending count. */
  done: () => void
  /** Get current pending count. */
  getCount: () => number
  /** Get details about active requests (for debugging stuck indicators). */
  getActiveRequests: () => ActiveRequestInfo[]
}

/**
 * Track in-flight UI actions and toggle a bound indicator element.
 */
export function createActivityIndicator(mount_element: HTMLElement | null): ActivityIndicator {
  const log = debug("activity")
  let pending_count = 0
  const active_requests = new Map<number, { type: string; start_ts: number }>()
  let next_request_id = 1

  function render(): void {
    if (!mount_element) {
      return
    }
    const is_active = pending_count > 0
    mount_element.toggleAttribute("hidden", !is_active)
    mount_element.setAttribute("aria-busy", is_active ? "true" : "false")
  }

  function start(): void {
    pending_count += 1
    log("start count=%d", pending_count)
    render()
  }

  function done(): void {
    const prev = pending_count
    pending_count = Math.max(0, pending_count - 1)
    if (prev <= 0) {
      log("done called but count was already %d", prev)
    } else {
      log("done count=%d→%d", prev, pending_count)
    }
    render()
  }

  /**
   * Wrap a transport-style send function to track activity.
   * Includes a safety timeout to prevent the loading indicator from getting stuck
   * if a request hangs due to network issues or server problems.
   */
  function wrapSend<T>(
    send_fn: (type: MessageType, payload?: unknown) => Promise<T>,
  ): (type: MessageType, payload?: unknown) => Promise<T> {
    // Safety timeout: if a request takes longer than this, force decrement the counter
    const SAFETY_TIMEOUT_MS = 30000 // 30 seconds

    return async (type: MessageType, payload?: unknown): Promise<T> => {
      const req_id = next_request_id++
      const start_ts = Date.now()
      active_requests.set(req_id, { type, start_ts })
      log("request start id=%d type=%s count=%d", req_id, type, pending_count + 1)
      start()

      // Track if we've already called done() for this request
      let completed = false
      const markComplete = (): void => {
        if (!completed) {
          completed = true
          active_requests.delete(req_id)
          done()
        }
      }

      // Safety timeout: force decrement if request takes too long
      const timeout_id = setTimeout(() => {
        if (!completed) {
          log("request TIMEOUT id=%d type=%s elapsed=%dms", req_id, type, Date.now() - start_ts)
          markComplete()
        }
      }, SAFETY_TIMEOUT_MS)

      try {
        const result = await send_fn(type, payload)
        const elapsed = Date.now() - start_ts
        log("request done id=%d type=%s elapsed=%dms", req_id, type, elapsed)
        return result
      } catch (err) {
        const elapsed = Date.now() - start_ts
        log("request error id=%d type=%s elapsed=%dms err=%o", req_id, type, elapsed, err)
        throw err
      } finally {
        clearTimeout(timeout_id)
        markComplete()
      }
    }
  }

  render()

  return {
    wrapSend,
    start,
    done,
    getCount: () => pending_count,
    getActiveRequests: (): ActiveRequestInfo[] => {
      const now = Date.now()
      return Array.from(active_requests.entries()).map(([id, info]) => ({
        id,
        type: info.type,
        elapsed_ms: now - info.start_ts,
      }))
    },
  }
}
