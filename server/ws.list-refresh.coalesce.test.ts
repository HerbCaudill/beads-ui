import type { WebSocket } from "ws"
import type { Mock } from "vitest"
import { createServer } from "node:http"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { fetchListForSubscription } from "./list-adapters.js"
import { attachWsServer, handleMessage, scheduleListRefresh } from "./ws.js"

vi.mock("./list-adapters.ts", () => ({
  fetchListForSubscription: vi.fn(async () => {
    return {
      ok: true,
      items: [
        { id: "A", updated_at: 1, closed_at: null },
        { id: "B", updated_at: 1, closed_at: null },
      ],
    }
  }),
}))

beforeEach(() => {
  vi.useFakeTimers()
})

interface StubSocket {
  sent: string[]
  readyState: number
  OPEN: number
  send: (msg: string) => void
}

describe("ws list refresh coalescing", () => {
  test("schedules one refresh per burst for active specs", async () => {
    const server = createServer()
    const { wss } = attachWsServer(server, {
      path: "/ws",
      heartbeat_ms: 10000,
      refresh_debounce_ms: 50,
    })

    // Two connected clients
    const a: StubSocket = {
      sent: [],
      readyState: 1,
      OPEN: 1,
      send(msg: string) {
        this.sent.push(String(msg))
      },
    }
    const b: StubSocket = {
      sent: [],
      readyState: 1,
      OPEN: 1,
      send(msg: string) {
        this.sent.push(String(msg))
      },
    }
    wss.clients.add(a as unknown as WebSocket)
    wss.clients.add(b as unknown as WebSocket)

    // Subscribe to two different lists
    await handleMessage(
      a as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "l1",
          type: "subscribe-list" as const,
          payload: { id: "c1", type: "all-issues" },
        }),
      ),
    )
    await handleMessage(
      b as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "l2",
          type: "subscribe-list" as const,
          payload: { id: "c2", type: "in-progress-issues" },
        }),
      ),
    )

    // Clear initial refresh calls from subscribe-list
    const mock = fetchListForSubscription as Mock
    mock.mockClear()

    // Simulate a burst of DB change events
    scheduleListRefresh()
    scheduleListRefresh()
    scheduleListRefresh()

    // Before debounce, nothing ran
    expect(mock.mock.calls.length).toBe(0)
    await vi.advanceTimersByTimeAsync(49)
    expect(mock.mock.calls.length).toBe(0)

    // After debounce window, one refresh per active spec
    await vi.advanceTimersByTimeAsync(1)
    expect(mock.mock.calls.length).toBe(2)
  })
})
