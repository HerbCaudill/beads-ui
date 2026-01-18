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

interface MockWsClient {
  send(type: MessageType, payload: unknown): Promise<unknown>
  on(type: MessageType, handler: (p: unknown) => void): () => void
  _trigger(type: MessageType, payload: unknown): void
  onConnection(fn: (s: "connecting" | "open" | "closed" | "reconnecting") => void): () => void
  close(): void
  getState(): string
}

// Mock WS client to allow pushing server events and observing RPCs
vi.mock("./ws.ts", () => {
  const handlers: Record<string, (p: unknown) => void> = {}
  const singleton: MockWsClient = {
    async send(_type: MessageType, _payload: unknown) {
      return null
    },
    on(type: MessageType, handler: (p: unknown) => void) {
      handlers[type] = handler
      return () => {
        delete handlers[type]
      }
    },
    /** Trigger a server push event in tests */
    _trigger(type: MessageType, payload: unknown) {
      if (handlers[type]) {
        handlers[type](payload)
      }
    },
    onConnection() {
      return () => {}
    },
    close() {},
    getState() {
      return "open"
    },
  }
  return { createWsClient: () => singleton }
})

describe("issues view — store resets on spec change", () => {
  test("accepts lower-revision snapshot for new list after filter change", async () => {
    const client = createWsClient() as unknown as MockWsClient
    window.location.hash = "#/issues"
    document.body.innerHTML = '<main id="app"></main>'
    const root = document.getElementById("app") as HTMLElement

    bootstrap(root)
    await Promise.resolve()

    // Seed tab:issues with a higher revision for the default list
    client._trigger("snapshot", {
      type: "snapshot",
      id: "tab:issues",
      revision: 5,
      issues: [
        {
          id: "A-1",
          title: "a",
          status: "open",
          created_at: 10,
          updated_at: 10,
        },
      ],
    })
    await Promise.resolve()

    // Switch to in_progress using dropdown checkbox
    toggleFilter(0, "In progress")
    await Promise.resolve()

    // Now deliver a snapshot for the new spec with a LOWER revision
    const inProg = [
      {
        id: "P-1",
        title: "prog 1",
        status: "in_progress",
        created_at: 200,
        updated_at: 200,
      },
    ]
    client._trigger("snapshot", {
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues: inProg,
    })
    await Promise.resolve()
    await Promise.resolve()

    const rows = Array.from(document.querySelectorAll("#list-root tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["P-1"])
  })
})
