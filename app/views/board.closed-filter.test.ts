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

describe("views/board closed filter", () => {
  test("filters closed issues by timeframe and sorts by closed_at", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement

    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    const issues = [
      {
        id: "C-1",
        title: "four days",
        closed_at: new Date(now - 4 * oneDay).getTime(),
      },
      {
        id: "C-2",
        title: "yesterday",
        closed_at: new Date(now - 1 * oneDay).getTime(),
      },
      { id: "C-3", title: "today", closed_at: new Date(now).getTime() },
    ] as Issue[]
    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:board:closed").applyPush({
      type: "snapshot",
      id: "tab:board:closed",
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

    // Default filter: Today → only C-3 visible
    let closed_ids = Array.from(mount.querySelectorAll("#closed-col .board-card .mono")).map(el =>
      el.textContent?.trim(),
    )
    expect(closed_ids).toEqual(["C-3"])

    // Change to Last 3 days → C-3 (today) and C-2 (yesterday)
    const select = mount.querySelector("#closed-filter") as HTMLSelectElement
    select.value = "3"
    select.dispatchEvent(new Event("change", { bubbles: true }))

    closed_ids = Array.from(mount.querySelectorAll("#closed-col .board-card .mono")).map(el =>
      el.textContent?.trim(),
    )
    expect(closed_ids).toEqual(["C-3", "C-2"])

    // Change to Last 7 days → all three, sorted by closed_at desc
    select.value = "7"
    select.dispatchEvent(new Event("change", { bubbles: true }))
    closed_ids = Array.from(mount.querySelectorAll("#closed-col .board-card .mono")).map(el =>
      el.textContent?.trim(),
    )
    expect(closed_ids).toEqual(["C-3", "C-2", "C-1"])
  })
})
