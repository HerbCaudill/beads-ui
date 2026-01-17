import { describe, expect, test, vi } from "vitest"
import { createWsClient } from "./ws.ts"

type EventHandler = (ev: Event) => void

interface FakeWebSocket {
  url: string
  readyState: number
  OPEN: number
  CLOSING: number
  CLOSED: number
  _listeners: Record<string, EventHandler[]>
  sent: string[]
  addEventListener(type: string, fn: EventHandler): void
  removeEventListener(type: string, fn: EventHandler): void
  _dispatch(type: string, ev: Event): void
  openNow(): void
  send(data: string): void
  emitMessage(obj: unknown): void
  close(): void
}

function setupFakeWebSocket(): FakeWebSocket[] {
  const sockets: FakeWebSocket[] = []
  class FakeWebSocketImpl implements FakeWebSocket {
    url: string
    readyState: number = 0 // CONNECTING
    OPEN = 1
    CLOSING = 2
    CLOSED = 3
    _listeners: Record<string, EventHandler[]> = { open: [], message: [], error: [], close: [] }
    sent: string[] = []

    constructor(url: string) {
      this.url = url
      sockets.push(this)
    }

    addEventListener(type: string, fn: EventHandler) {
      if (!this._listeners[type]) {
        this._listeners[type] = []
      }
      this._listeners[type].push(fn)
    }

    removeEventListener(type: string, fn: EventHandler) {
      const a = this._listeners[type]
      if (a) {
        const i = a.indexOf(fn)
        if (i !== -1) {
          a.splice(i, 1)
        }
      }
    }

    _dispatch(type: string, ev: Event) {
      const handlers = this._listeners[type]
      if (handlers) {
        for (const fn of handlers) {
          try {
            fn(ev)
          } catch {
            // ignore
          }
        }
      }
    }

    openNow() {
      this.readyState = this.OPEN
      this._dispatch("open", new Event("open"))
    }

    send(data: string) {
      this.sent.push(String(data))
    }

    emitMessage(obj: unknown) {
      this._dispatch("message", { data: JSON.stringify(obj) } as unknown as Event)
    }

    close() {
      this.readyState = this.CLOSED
      this._dispatch("close", new CloseEvent("close"))
    }
  }
  vi.stubGlobal("WebSocket", FakeWebSocketImpl)
  return sockets
}

describe("app/ws client", () => {
  test("correlates replies for concurrent sends", async () => {
    const sockets = setupFakeWebSocket()
    const client = createWsClient({
      backoff: { initialMs: 5, maxMs: 5, jitterRatio: 0 },
    })
    // open connection
    sockets[0]!.openNow()

    const p1 = client.send("list-issues", { filters: {} })
    const p2 = client.send("edit-text", {
      id: "UI-1",
      field: "title",
      value: "T",
    })

    // Parse the last two frames to extract ids
    const frames = sockets[0]!.sent.slice(-2).map(s => JSON.parse(s))
    const id1 = frames[0].id
    const id2 = frames[1].id

    // Reply out of order
    sockets[0]!.emitMessage({
      id: id2,
      ok: true,
      type: "edit-text",
      payload: { id: "UI-1" },
    })
    sockets[0]!.emitMessage({
      id: id1,
      ok: true,
      type: "list-issues",
      payload: [{ id: "UI-1" }],
    })

    await expect(p2).resolves.toEqual({ id: "UI-1" })
    await expect(p1).resolves.toEqual([{ id: "UI-1" }])
  })

  test("reconnects after close", async () => {
    vi.useFakeTimers()
    const sockets = setupFakeWebSocket()
    const client = createWsClient({
      backoff: { initialMs: 10, maxMs: 10, jitterRatio: 0 },
    })

    // First connection opens
    sockets[0]!.openNow()

    // Close the socket to trigger reconnect
    sockets[0]!.close()
    // Advance timers for reconnect
    await vi.advanceTimersByTimeAsync(10)

    // Second socket should exist and open
    expect(sockets.length).toBeGreaterThan(1)
    sockets[1]!.openNow()
    // No automatic subscribe frames in v2; just ensure reconnect occurred
    expect(Array.isArray(sockets[1]!.sent)).toBe(true)

    vi.useRealTimers()
    client.close()
  })

  test("dispatches server events", async () => {
    const sockets = setupFakeWebSocket()
    const client = createWsClient()
    sockets[0]!.openNow()

    const events: unknown[] = []
    client.on("snapshot", p => events.push(p))
    sockets[0]!.emitMessage({
      id: "evt-1",
      ok: true,
      type: "snapshot",
      payload: {
        type: "snapshot",
        id: "any",
        revision: 1,
        issues: [],
      },
    })
    expect(events.length).toBe(1)

    // No handler registered for create-issue -> warn
    sockets[0]!.emitMessage({
      id: "evt-2",
      ok: true,
      type: "create-issue",
      payload: {},
    })
    client.close()
  })

  // Removed: subscription ack frames; no warnings to test
})
