import { describe, expect, test } from "vitest"
import { createSubscriptionIssueStore } from "../data/subscription-issue-store.js"
import { createBoardView } from "./board.js"
import type { IssueStores } from "../data/list-selectors.js"
import type { Issue } from "../../types/issues.js"
import type { SnapshotMsg } from "../../types/subscription-issue-store.js"

function createTestIssueStores() {
  const stores = new Map<string, ReturnType<typeof createSubscriptionIssueStore>>()
  const listeners = new Set<() => void>()
  function getStore(id: string) {
    let s = stores.get(id)
    if (!s) {
      s = createSubscriptionIssueStore(id)
      stores.set(id, s)
      s.subscribe(() => {
        for (const fn of Array.from(listeners)) {
          try {
            fn()
          } catch {
            /* ignore */
          }
        }
      })
    }
    return s
  }
  return {
    getStore,
    snapshotFor(id: string) {
      return getStore(id).snapshot().slice()
    },
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

describe("views/board keyboard navigation", () => {
  test("ArrowUp/ArrowDown move within column", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement

    const issues = [
      { id: "P-1", title: "p1", updated_at: new Date("2025-10-23T10:00:00.000Z").getTime() },
      { id: "P-2", title: "p2", updated_at: new Date("2025-10-23T09:00:00.000Z").getTime() },
    ] as Issue[]
    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:board:in-progress").applyPush({
      type: "snapshot",
      id: "tab:board:in-progress",
      revision: 1,
      issues,
    } as SnapshotMsg)

    const view = createBoardView(
      mount,
      null,
      () => {},
      undefined,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    const first = mount.querySelector("#in-progress-col .board-card") as HTMLElement
    const second = mount.querySelectorAll("#in-progress-col .board-card")[1] as HTMLElement
    first.focus()
    expect(document.activeElement).toBe(first)

    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    expect(document.activeElement).toBe(second)

    second.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }))
    expect(document.activeElement).toBe(first)
  })

  test("ArrowLeft/ArrowRight jump to top card in adjacent non-empty column, skipping empty", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement

    const issues = [
      { id: "B-1", title: "b1", updated_at: new Date("2025-10-23T10:00:00.000Z").getTime() },
      { id: "P-1", title: "p1", updated_at: new Date("2025-10-23T10:00:00.000Z").getTime() },
      { id: "P-2", title: "p2", updated_at: new Date("2025-10-23T09:00:00.000Z").getTime() },
    ] as Issue[]
    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:board:blocked").applyPush({
      type: "snapshot",
      id: "tab:board:blocked",
      revision: 1,
      issues: issues.filter(i => i.id.startsWith("B-")),
    } as SnapshotMsg)
    issueStores.getStore("tab:board:in-progress").applyPush({
      type: "snapshot",
      id: "tab:board:in-progress",
      revision: 1,
      issues: issues.filter(i => i.id.startsWith("P-")),
    } as SnapshotMsg)

    const opened: string[] = []
    const view = createBoardView(
      mount,
      null,
      id => {
        opened.push(id)
      },
      undefined,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    const open_first = mount.querySelector("#blocked-col .board-card") as HTMLElement
    const prog_first = mount.querySelector("#in-progress-col .board-card") as HTMLElement
    open_first.focus()
    open_first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    expect(document.activeElement).toBe(prog_first)

    // Enter opens the details (via goto_issue callback)
    prog_first.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    expect(opened).toEqual(["P-1"])

    // Space also opens
    prog_first.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }))
    expect(opened).toEqual(["P-1", "P-1"])
  })
})
