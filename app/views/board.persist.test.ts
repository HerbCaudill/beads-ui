import { describe, expect, test } from "vitest"
import { createSubscriptionIssueStore } from "../data/subscription-issue-store.js"
import { createBoardView } from "./board.js"
import type { IssueStores } from "../data/list-selectors.js"
import type { Issue } from "../../types/issues.js"
import type { SnapshotMsg } from "../../types/subscription-issue-store.js"
import type { Store } from "../state.js"

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

describe("views/board persisted closed filter via store", () => {
  test("applies persisted closed_filter and updates store on change", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement

    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    const issues = [
      { id: "A", closed_at: new Date(now - 8 * oneDay).getTime() },
      { id: "B", closed_at: new Date(now - 2 * oneDay).getTime() },
      { id: "C", closed_at: new Date(now).getTime() },
    ] as Issue[]
    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:board:closed").applyPush({
      type: "snapshot",
      id: "tab:board:closed",
      revision: 1,
      issues,
    } as SnapshotMsg)

    const store = {
      state: {
        selected_id: null,
        view: "board",
        filters: { status: "all", search: "", type: "" },
        board: { closed_filter: "7" },
        workspace: null,
      },
      subs: [] as (() => void)[],
      getState() {
        return this.state
      },
      setState(patch: Partial<typeof this.state>) {
        this.state = {
          ...this.state,
          ...(patch || {}),
          filters: { ...this.state.filters, ...((patch as { filters?: object }).filters || {}) },
          board: { ...this.state.board, ...((patch as { board?: object }).board || {}) },
        }
        for (const fn of this.subs) {
          fn()
        }
      },
      subscribe(fn: () => void) {
        this.subs.push(fn)
        return () => {
          this.subs = this.subs.filter(f => f !== fn)
        }
      },
    }

    const view = createBoardView(
      mount,
      null,
      () => {},
      store as unknown as Store,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    // With persisted '7' days, B and C visible (A is 8 days old)
    let closed_ids = Array.from(mount.querySelectorAll("#closed-col .board-card")).map(el =>
      el.getAttribute("data-issue-id"),
    )
    expect(closed_ids).toEqual(["C", "B"])

    // Select reflects persisted value
    const select = mount.querySelector("#closed-filter") as HTMLSelectElement
    expect(select.value).toBe("7")

    // Change to '3' and ensure store updates
    select.value = "3"
    select.dispatchEvent(new Event("change", { bubbles: true }))
    expect(store.getState().board.closed_filter).toBe("3")

    // Now still B and C visible (both within 3 days)
    closed_ids = Array.from(mount.querySelectorAll("#closed-col .board-card")).map(el =>
      el.getAttribute("data-issue-id"),
    )
    expect(closed_ids).toEqual(["C", "B"])
  })
})
