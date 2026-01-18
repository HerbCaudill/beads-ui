import { describe, expect, test, vi } from "vitest"
import { bootstrap } from "./main-bootstrap.ts"

// Mock ws client factory to inject a controllable client
interface MockWsClient {
  send: ReturnType<typeof vi.fn>
  on(type: string, handler: (p: unknown) => void): () => void
  onConnection(handler: (s: "connecting" | "open" | "closed" | "reconnecting") => void): () => void
  triggerConn(state: "connecting" | "open" | "closed" | "reconnecting"): void
  close(): void
  getState(): string
  _handler?: (p: unknown) => void
  _conn?: (s: "connecting" | "open" | "closed" | "reconnecting") => void
}

let CLIENT: MockWsClient | null = null
vi.mock("./ws.ts", () => ({
  createWsClient: () => CLIENT,
}))

describe("main websocket toast notifications", () => {
  test("shows toast on connection loss and on reconnect", async () => {
    vi.useFakeTimers()
    CLIENT = {
      // Minimal send used during bootstrap (push-only tests avoid read RPCs)
      send: vi.fn(async () => []),
      on(type: string, handler: (p: unknown) => void) {
        this._handler = handler
        void type
        return () => {}
      },
      onConnection(handler: (s: "connecting" | "open" | "closed" | "reconnecting") => void) {
        this._conn = handler
        return () => {}
      },
      triggerConn(state: "connecting" | "open" | "closed" | "reconnecting") {
        if (this._conn) {
          this._conn(state)
        }
      },
      close() {},
      getState() {
        return "open"
      },
    }

    document.body.innerHTML = '<main id="app"></main>'
    const root = document.getElementById("app") as HTMLElement

    bootstrap(root)
    await Promise.resolve()

    // Simulate reconnecting -> toast appears
    CLIENT.triggerConn("reconnecting")
    await Promise.resolve()
    const lost = document.querySelector(".toast") as HTMLElement
    expect(lost).not.toBeNull()
    expect((lost.textContent || "").toLowerCase()).toContain("connection lost")

    // Simulate open after disconnect -> success toast
    CLIENT.triggerConn("open")
    await Promise.resolve()
    const toasts = Array.from(document.querySelectorAll(".toast"))
    expect(toasts.some(t => (t.textContent || "").toLowerCase().includes("reconnected"))).toBe(true)

    // Let timers flush auto-dismiss to avoid leaking DOM between tests
    await vi.advanceTimersByTimeAsync(5000)
    vi.useRealTimers()
  })
})
