import { describe, expect, test, vi } from "vitest"
import { createDetailView } from "./detail.js"
import type { IssueStores } from "../data/list-selectors.js"

function mountDiv() {
  const div = document.createElement("div")
  document.body.appendChild(div)
  return div
}

describe("detail view labels", () => {
  test("shows labels and allows add/remove", async () => {
    const mount = mountDiv()
    let current = {
      id: "UI-5",
      title: "With labels",
      status: "open",
      priority: 2,
      labels: ["frontend"],
    }
    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-5" ? [current] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const sendFn = vi.fn(async (type: string, payload?: unknown) => {
      if (type === "label-add") {
        current = { ...current, labels: [...current.labels, (payload as { label: string }).label] }
        return current
      }
      if (type === "label-remove") {
        current = {
          ...current,
          labels: current.labels.filter(l => l !== (payload as { label: string }).label),
        }
        return current
      }
      return current
    })

    const view = createDetailView(mount, sendFn, undefined, stores as unknown as IssueStores)
    await view.load("UI-5")

    // Initial chip present
    expect(mount.querySelectorAll(".labels .badge").length).toBe(1)

    // Add a label via input + Enter
    const input = mount.querySelector(".labels input") as HTMLInputElement
    input.value = "backend"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    await Promise.resolve()

    expect(sendFn).toHaveBeenCalledWith("label-add", {
      id: "UI-5",
      label: "backend",
    })
    expect(mount.querySelectorAll(".labels .badge").length).toBe(2)

    // Remove the first label by clicking the × button
    const removeBtn = mount.querySelector(".labels .badge button") as HTMLButtonElement
    removeBtn.click()
    await Promise.resolve()
    expect(sendFn).toHaveBeenCalledWith("label-remove", {
      id: "UI-5",
      label: "frontend",
    })
    expect(mount.querySelectorAll(".labels .badge").length).toBe(1)
  })
})
