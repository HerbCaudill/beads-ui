/**
 * Persistent WebSocket client with reconnect, request/response correlation,
 * and simple event dispatching.
 *
 * Usage:
 *   const ws = createWsClient();
 *   const data = await ws.send('list-issues', { filters: {} });
 *   const off = ws.on('snapshot', (payload) => { <push event> });
 */
import type { MessageType, RequestEnvelope } from "../types/protocol.js"
import type {
  BackoffOptions,
  ClientOptions,
  ConnectionState,
  WsClient,
} from "../types/ws-client.js"
import { MESSAGE_TYPES, makeRequest, nextId } from "./protocol.js"
import { debug } from "./utils/logging.js"

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  type: MessageType
}

/**
 * Create a WebSocket client with auto-reconnect and message correlation.
 */
export function createWsClient(options: ClientOptions = {}): WsClient {
  const log = debug("ws")

  const backoff: Required<BackoffOptions> = {
    initialMs: options.backoff?.initialMs ?? 1000,
    maxMs: options.backoff?.maxMs ?? 30000,
    factor: options.backoff?.factor ?? 2,
    jitterRatio: options.backoff?.jitterRatio ?? 0.2,
  }

  const resolveUrl = (): string => {
    if (options.url && options.url.length > 0) {
      return options.url
    }
    if (typeof location !== "undefined") {
      return (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws"
    }
    return "ws://localhost/ws"
  }

  let ws: WebSocket | null = null
  let state: ConnectionState = "closed"
  let attempts = 0
  let reconnect_timer: ReturnType<typeof setTimeout> | null = null
  let should_reconnect = true

  const pending = new Map<string, PendingRequest>()
  const queue: RequestEnvelope[] = []
  const handlers = new Map<string, Set<(payload: unknown) => void>>()
  const connection_handlers = new Set<(s: ConnectionState) => void>()

  function notifyConnection(s: ConnectionState): void {
    for (const fn of Array.from(connection_handlers)) {
      try {
        fn(s)
      } catch {
        // ignore listener errors
      }
    }
  }

  function scheduleReconnect(): void {
    if (!should_reconnect || reconnect_timer) {
      return
    }
    state = "reconnecting"
    log("ws reconnecting…")
    notifyConnection(state)
    const base = Math.min(backoff.maxMs, backoff.initialMs * Math.pow(backoff.factor, attempts))
    const jitter = backoff.jitterRatio * base
    const delay = Math.max(0, Math.round(base + (Math.random() * 2 - 1) * jitter))
    log("ws retry in %d ms (attempt %d)", delay, attempts + 1)
    reconnect_timer = setTimeout(() => {
      reconnect_timer = null
      connect()
    }, delay)
  }

  function sendRaw(req: RequestEnvelope): void {
    try {
      ws?.send(JSON.stringify(req))
    } catch (err) {
      log("ws send failed", err)
    }
  }

  function onOpen(): void {
    state = "open"
    log("ws open")
    notifyConnection(state)
    attempts = 0
    // flush queue
    while (queue.length) {
      const req = queue.shift()
      if (req) {
        sendRaw(req)
      }
    }
  }

  function onMessage(ev: MessageEvent): void {
    let msg: { id?: unknown; type?: unknown; ok?: unknown; payload?: unknown; error?: unknown }
    try {
      msg = JSON.parse(String(ev.data))
    } catch {
      log("ws received non-JSON message")
      return
    }
    if (!msg || typeof msg.id !== "string" || typeof msg.type !== "string") {
      log("ws received invalid envelope")
      return
    }

    const id = msg.id
    if (pending.has(id)) {
      const entry = pending.get(id)
      pending.delete(id)
      if (msg.ok) {
        entry?.resolve(msg.payload)
      } else {
        entry?.reject(msg.error || new Error("ws error"))
      }
      return
    }

    // Treat as server-initiated event
    const set = handlers.get(msg.type)
    if (set && set.size > 0) {
      for (const fn of Array.from(set)) {
        try {
          fn(msg.payload)
        } catch (err) {
          log("ws event handler error", err)
        }
      }
    } else {
      log("ws received unhandled message type: %s", msg.type)
    }
  }

  function onClose(): void {
    state = "closed"
    log("ws closed")
    notifyConnection(state)
    // fail all pending
    for (const [id, p] of pending.entries()) {
      p.reject(new Error("ws disconnected"))
      pending.delete(id)
    }
    attempts += 1
    scheduleReconnect()
  }

  function connect(): void {
    if (!should_reconnect) {
      return
    }
    const url = resolveUrl()
    try {
      ws = new WebSocket(url)
      log("ws connecting %s", url)
      state = "connecting"
      notifyConnection(state)
      ws.addEventListener("open", onOpen)
      ws.addEventListener("message", onMessage)
      ws.addEventListener("error", () => {
        // let close handler handle reconnect
      })
      ws.addEventListener("close", onClose)
    } catch (err) {
      log("ws connect failed %o", err)
      scheduleReconnect()
    }
  }

  connect()

  return {
    /**
     * Send a request and await its correlated reply payload.
     */
    send(type: MessageType, payload?: unknown): Promise<unknown> {
      if (!MESSAGE_TYPES.includes(type)) {
        return Promise.reject(new Error(`unknown message type: ${type}`))
      }
      const id = nextId()
      const req = makeRequest(type, payload, id)
      log("send %s id=%s", type, id)
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, type })
        if (ws && ws.readyState === ws.OPEN) {
          sendRaw(req)
        } else {
          log("queue %s id=%s (state=%s)", type, id, state)
          queue.push(req)
        }
      })
    },

    /**
     * Register a handler for a server-initiated event type.
     * Returns an unsubscribe function.
     */
    on(type: MessageType, handler: (payload: unknown) => void): () => void {
      if (!handlers.has(type)) {
        handlers.set(type, new Set())
      }
      const set = handlers.get(type)
      set?.add(handler)
      return () => {
        set?.delete(handler)
      }
    },

    /**
     * Subscribe to connection state changes.
     */
    onConnection(handler: (state: ConnectionState) => void): () => void {
      connection_handlers.add(handler)
      return () => {
        connection_handlers.delete(handler)
      }
    },

    /** Close and stop reconnecting. */
    close(): void {
      should_reconnect = false
      if (reconnect_timer) {
        clearTimeout(reconnect_timer)
        reconnect_timer = null
      }
      try {
        ws?.close()
      } catch {
        /* ignore */
      }
    },

    /** For diagnostics in tests or UI. */
    getState(): ConnectionState {
      return state
    },
  }
}
