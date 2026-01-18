import { describe, expect, test, vi, beforeEach } from "vitest"
import { bootstrap } from "./main.tsx"
import { useToastStore } from "./store/toast-store.js"

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
  beforeEach(() => {
    // Clear toast store before each test
    useToastStore.setState({ toasts: [] })
  })

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

    // Simulate reconnecting -> toast appears in store
    CLIENT.triggerConn("reconnecting")
    await Promise.resolve()
    const lostToast = useToastStore
      .getState()
      .toasts.find(t => t.text.toLowerCase().includes("connection lost"))
    expect(lostToast).toBeDefined()
    expect(lostToast?.variant).toBe("error")

    // Simulate open after disconnect -> success toast in store
    CLIENT.triggerConn("open")
    await Promise.resolve()
    const reconnectedToast = useToastStore
      .getState()
      .toasts.find(t => t.text.toLowerCase().includes("reconnected"))
    expect(reconnectedToast).toBeDefined()
    expect(reconnectedToast?.variant).toBe("success")

    // Let timers flush auto-dismiss to avoid leaking state between tests
    await vi.advanceTimersByTimeAsync(5000)
    vi.useRealTimers()
  })
})
