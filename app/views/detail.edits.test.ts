import { describe, expect, test, vi } from "vitest"
import { createDetailView } from "./detail.js"

const mockSend = (impl: (type: string, payload?: unknown) => Promise<unknown>) => vi.fn(impl)

describe("views/detail edits", () => {
  test("updates status via dropdown and disables while pending", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const initial = {
      id: "UI-7",
      title: "T",
      description: "D",
      status: "open",
      priority: 2,
    }
    const updated = { ...initial, status: "in_progress" }

    const stores1 = {
      snapshotFor(id: string) {
        return id === "detail:UI-7" ? [initial] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = mockSend(async (type, payload) => {
      if (type === "update-status") {
        expect(payload).toEqual({ id: "UI-7", status: "in_progress" })
        // simulate server reconcile payload
        return updated
      }
      throw new Error("Unexpected")
    })

    const view = createDetailView(mount, send, undefined, stores1)
    await view.load("UI-7")

    const select = mount.querySelector("select") as HTMLSelectElement
    expect(select.value).toBe("open")

    // Trigger change
    select.value = "in_progress"
    const beforeDisabled = select.disabled
    select.dispatchEvent(new Event("change"))
    // After dispatch, the component sets disabled & will re-render upon reply
    expect(beforeDisabled || select.disabled).toBe(true)

    // After async flow, DOM should reflect updated status
    await Promise.resolve() // allow microtasks
    const select2 = mount.querySelector("select") as HTMLSelectElement
    expect(select2.value).toBe("in_progress")
  })

  test("saves title and re-renders from reply", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement
    const initial = {
      id: "UI-8",
      title: "Old",
      description: "",
      status: "open",
      priority: 1,
    }
    const stores2 = {
      snapshotFor(id: string) {
        return id === "detail:UI-8" ? [initial] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = mockSend(async (type, payload) => {
      if (type === "edit-text") {
        const next = { ...initial, title: (payload as { value: string }).value }
        return next
      }
      throw new Error("Unexpected")
    })
    const view = createDetailView(mount, send, undefined, stores2)
    await view.load("UI-8")
    // Enter edit mode by clicking the span
    const titleSpan = mount.querySelector("h2 .editable") as HTMLSpanElement
    titleSpan.click()
    const titleInput = mount.querySelector("h2 input") as HTMLInputElement
    const titleSave = mount.querySelector("h2 button") as HTMLButtonElement
    titleInput.value = "New Title"
    titleSave.click()
    await Promise.resolve()
    // After save, returns to read mode with updated text
    const titleSpan2 = mount.querySelector("h2 .editable") as HTMLSpanElement
    expect(titleSpan2.textContent).toBe("New Title")
  })

  test("shows toast on description save error and re-enables", async () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement
    const initial = {
      id: "UI-9",
      title: "T",
      description: "D",
      status: "open",
      priority: 2,
    }
    const stores3 = {
      snapshotFor(id: string) {
        return id === "detail:UI-9" ? [initial] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = mockSend(async type => {
      if (type === "edit-text") {
        throw new Error("boom")
      }
      throw new Error("Unexpected")
    })
    const view = createDetailView(mount, send, undefined, stores3)
    await view.load("UI-9")
    // Enter edit mode
    const md = mount.querySelector(".md") as HTMLDivElement
    md.click()
    const ta = mount.querySelector("textarea") as HTMLTextAreaElement
    const btn = mount.querySelector(".editable-actions button") as HTMLButtonElement
    ta.value = "New D"
    btn.click()
    await Promise.resolve()
    // Toast appears
    const toast = document.body.querySelector(".toast") as HTMLElement
    expect(toast).not.toBeNull()
    expect((toast.textContent || "").toLowerCase()).toContain("failed to save description")
    // Auto-dismiss after a while
    await vi.advanceTimersByTimeAsync(3000)
    vi.useRealTimers()
  })
})
