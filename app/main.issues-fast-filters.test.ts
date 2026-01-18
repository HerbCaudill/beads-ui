import { describe, expect, test, vi } from "vitest"
import { bootstrap } from "./main-lit.ts"
import { createWsClient } from "./ws.ts"
import type { MessageType } from "./protocol.js"

/**
 * Helper to toggle a filter option in a dropdown.
 */
function toggleFilter(dropdownIndex: number, optionText: string) {
  const dropdowns = document.querySelectorAll(".filter-dropdown")
  const dropdown = dropdowns[dropdownIndex]
  // Open the dropdown
  const trigger = dropdown?.querySelector(".filter-dropdown__trigger") as HTMLButtonElement
  trigger.click()
  // Find and click the checkbox
  const option = Array.from(dropdown?.querySelectorAll(".filter-dropdown__option") || []).find(
    opt => opt.textContent?.includes(optionText),
  )
  const checkbox = option?.querySelector('input[type="checkbox"]') as HTMLInputElement
  checkbox.click()
}

// Mock WS client to drive push envelopes and record RPCs
const calls: { type: string; payload: unknown }[] = []

interface MockWsClient {
  send(type: MessageType, payload: unknown): Promise<unknown>
  on(type: MessageType, handler: (p: unknown) => void): () => void
  _trigger(type: MessageType, payload: unknown): void
  onConnection(fn: (s: "connecting" | "open" | "closed" | "reconnecting") => void): () => void
  _emitConn(s: "connecting" | "open" | "closed" | "reconnecting"): void
  close(): void
  getState(): string
}

vi.mock("./ws.ts", () => {
  const handlers: Record<string, (p: unknown) => void> = {}
  const connHandlers = new Set<(s: "connecting" | "open" | "closed" | "reconnecting") => void>()
  const singleton: MockWsClient = {
    async send(type: MessageType, payload: unknown) {
      calls.push({ type, payload })
      return null
    },
    on(type: MessageType, handler: (p: unknown) => void) {
      handlers[type] = handler
      return () => {
        delete handlers[type]
      }
    },
    /** Test helper: trigger a server event */
    _trigger(type: MessageType, payload: unknown) {
      if (handlers[type]) {
        handlers[type](payload)
      }
    },
    onConnection(fn: (s: "connecting" | "open" | "closed" | "reconnecting") => void) {
      connHandlers.add(fn)
      return () => connHandlers.delete(fn)
    },
    /** Test helper: emit connection state */
    _emitConn(s: "connecting" | "open" | "closed" | "reconnecting") {
      for (const fn of Array.from(connHandlers)) {
        try {
          fn(s)
        } catch {
          /* ignore */
        }
      }
    },
    close() {},
    getState() {
      return "open"
    },
  }
  return { createWsClient: () => singleton }
})

describe("issues view — fast filter switching", () => {
  test("ignores out-of-order snapshots during quick status toggles and renders from stores", async () => {
    const client = createWsClient() as unknown as MockWsClient
    window.location.hash = "#/issues"
    document.body.innerHTML = '<main id="app"></main>'
    const root = document.getElementById("app") as HTMLElement

    bootstrap(root)
    // Let router + subscriptions wire
    await Promise.resolve()

    // Initially no rows
    expect(document.querySelectorAll("#list-root .issue-row").length).toBe(0)

    // Deliver an initial snapshot for the default 'all' spec to ensure
    // the per-subscription store exists and view wiring is live.
    client._trigger("snapshot", {
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues: [],
    })
    await Promise.resolve()

    // Quickly toggle status: all -> ready -> in_progress before any server data
    // all -> ready
    toggleFilter(0, "Ready")
    // ready -> in_progress (fast)
    toggleFilter(0, "In progress")
    // Allow store subscriptions and sub_issue_stores.register to run
    await Promise.resolve()
    await Promise.resolve()

    // Now deliver snapshots out-of-order: newer revision first, then stale
    const inProg = [
      {
        id: "P-1",
        title: "prog 1",
        status: "in_progress",
        created_at: 200,
        updated_at: 200,
      },
      {
        id: "P-2",
        title: "prog 2",
        status: "in_progress",
        created_at: 210,
        updated_at: 210,
      },
    ]
    const ready = [
      {
        id: "R-1",
        title: "ready 1",
        status: "open",
        created_at: 100,
        updated_at: 100,
      },
    ]

    // Newer revision for in-progress
    client._trigger("snapshot", {
      type: "snapshot",
      id: "tab:issues",
      revision: 3,
      issues: inProg,
    })
    await Promise.resolve()
    await Promise.resolve()

    // Older revision for the previously selected ready list — must be ignored
    client._trigger("snapshot", {
      type: "snapshot",
      id: "tab:issues",
      revision: 2,
      issues: ready,
    })
    await Promise.resolve()
    await Promise.resolve()

    const rows = Array.from(document.querySelectorAll("#list-root tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["P-1", "P-2"])

    // Ensure no list-issues RPCs are made (push-only source of truth)
    const sentListIssues = calls.filter(c => c.type === "list-issues")
    expect(sentListIssues.length).toBe(0)
  })
})
