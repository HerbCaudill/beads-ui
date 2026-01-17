import { describe, expect, test, vi } from "vitest"
import { bootstrap } from "./main.ts"

// Mock WS client before importing the app
vi.mock("./ws.ts", () => ({
  createWsClient: () => ({
    async send(_type: string) {
      return null
    },
    on() {
      return () => {}
    },
    close() {},
    getState() {
      return "open"
    },
  }),
}))

describe("initial view sync on reload (#/epics)", () => {
  test("shows Epics view when hash is #/epics", async () => {
    window.location.hash = "#/epics"
    document.body.innerHTML = '<main id="app"></main>'
    const root = document.getElementById("app") as HTMLElement

    bootstrap(root)

    // Allow any microtasks to flush
    await Promise.resolve()

    const issuesRoot = document.getElementById("issues-root") as HTMLElement
    const epicsRoot = document.getElementById("epics-root") as HTMLElement

    expect(issuesRoot.hidden).toBe(true)
    expect(epicsRoot.hidden).toBe(false)
  })
})
