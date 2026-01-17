import type { WebSocket } from "ws"
import type { Mock } from "vitest"
import { createServer } from "node:http"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { runBd } from "./bd.js"
import { fetchListForSubscription } from "./list-adapters.js"
import { attachWsServer, handleMessage, scheduleListRefresh } from "./ws.js"

vi.mock("./bd.ts", () => ({ runBdJson: vi.fn(), runBd: vi.fn() }))
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

function makeSocket(): StubSocket {
  return {
    sent: [],
    readyState: 1,
    OPEN: 1,
    send(msg: string) {
      this.sent.push(String(msg))
    },
  }
}

async function subscribeTwoLists(wss: { clients: Set<WebSocket> }): Promise<void> {
  const a = makeSocket()
  const b = makeSocket()
  wss.clients.add(a as unknown as WebSocket)
  wss.clients.add(b as unknown as WebSocket)
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
}

describe("mutation window gating", () => {
  test("watcher-first resolves gate and refreshes once", async () => {
    const server = createServer()
    const { wss } = attachWsServer(server, {
      path: "/ws",
      refresh_debounce_ms: 50,
    })

    await subscribeTwoLists(wss)

    // Clear any refresh calls from initial subscriptions
    const mFetch = fetchListForSubscription as Mock
    mFetch.mockClear()

    // Prepare mutation stubs
    const mRun = runBd as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "UI-99", stderr: "" })

    // Fire a mutation
    const ws = makeSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "create1",
          type: "create-issue" as const,
          payload: { title: "X" },
        }),
      ),
    )

    // Simulate watcher event arriving before timeout
    scheduleListRefresh()

    // Allow pending promises and microtasks to flush
    await vi.advanceTimersByTimeAsync(0)
    await Promise.resolve()

    // Exactly one refresh pass over active specs
    expect(mFetch.mock.calls.length).toBe(2)
  })

  test("timeout-first triggers refresh after 500ms", async () => {
    const server = createServer()
    const { wss } = attachWsServer(server, {
      path: "/ws",
      refresh_debounce_ms: 50,
    })

    await subscribeTwoLists(wss)

    const mFetch = fetchListForSubscription as Mock
    mFetch.mockClear()

    const mRun = runBd as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "UI-100", stderr: "" })

    const ws = makeSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "create2",
          type: "create-issue" as const,
          payload: { title: "Y" },
        }),
      ),
    )

    // Before timeout, no refreshes triggered
    await vi.advanceTimersByTimeAsync(499)
    expect(mFetch.mock.calls.length).toBe(0)

    // After timeout, one refresh per active spec
    await vi.advanceTimersByTimeAsync(1)
    expect(mFetch.mock.calls.length).toBe(2)
  })
})
