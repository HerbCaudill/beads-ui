import { describe, expect, test, vi } from "vitest"
import { createDetailView } from "./detail.js"
import type { IssueStores } from "../data/list-selectors.js"

function setupDom() {
  const root = document.createElement("div")
  document.body.appendChild(root)
  return root
}

describe("views/detail dependencies", () => {
  test("adds Dependencies link and re-renders", async () => {
    const mount = setupDom()
    const current = { id: "UI-10", title: "X", dependencies: [], dependents: [] }
    const stores1 = {
      snapshotFor(id: string) {
        return id === "detail:UI-10" ? [current] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = vi.fn(async type => {
      if (type === "dep-add") {
        return current
      }
      throw new Error("Unexpected")
    })
    const view = createDetailView(mount, send, undefined, stores1 as unknown as IssueStores)
    await view.load("UI-10")

    const input = mount.querySelector('[data-testid="add-dependency"]')
    expect(input).toBeTruthy()
    const el = input as HTMLInputElement
    el.value = "UI-2"
    const addBtn = el.nextElementSibling
    addBtn?.dispatchEvent(new window.Event("click"))

    // Next tick
    await Promise.resolve()

    // Should have called dep-add
    const calls = send.mock.calls.map(c => c[0])
    expect(calls.includes("dep-add")).toBe(true)
  })

  test("removes Blocks link", async () => {
    const mount = setupDom()
    const current2 = {
      id: "UI-20",
      title: "Y",
      dependencies: [],
      dependents: [{ id: "UI-5" }],
    }
    const stores2 = {
      snapshotFor(id: string) {
        return id === "detail:UI-20" ? [current2] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = vi.fn(async type => {
      if (type === "dep-remove") {
        return { id: "UI-20", dependencies: [], dependents: [] }
      }
      throw new Error("Unexpected")
    })
    const view = createDetailView(mount, send, undefined, stores2 as unknown as IssueStores)
    await view.load("UI-20")

    // Find the remove button next to link #5
    const btns = mount.querySelectorAll("button")
    const rm = Array.from(btns).find(b => b.getAttribute("aria-label")?.includes("UI-5"))
    expect(rm).toBeTruthy()
    rm?.dispatchEvent(new window.Event("click"))

    await Promise.resolve()
    const calls = send.mock.calls.map(c => c[0])
    expect(calls.includes("dep-remove")).toBe(true)
  })

  test("prevents duplicate link add", async () => {
    const mount = setupDom()
    const current3 = {
      id: "UI-30",
      dependencies: [{ id: "UI-9" }],
      dependents: [],
    }
    const stores3 = {
      snapshotFor(id: string) {
        return id === "detail:UI-30" ? [current3] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = vi.fn(async (_type: string, _payload?: unknown) => current3)
    const view = createDetailView(mount, send, undefined, stores3 as unknown as IssueStores)
    await view.load("UI-30")

    const input = mount.querySelector('[data-testid="add-dependency"]')
    const el = input as HTMLInputElement
    el.value = "UI-9"
    const addBtn = el.nextElementSibling
    addBtn?.dispatchEvent(new window.Event("click"))

    await Promise.resolve()
    // send should not be called with dep-add
    const calls = send.mock.calls.map(c => c[0] as string)
    expect(calls.includes("dep-add")).toBe(false)
  })
})
