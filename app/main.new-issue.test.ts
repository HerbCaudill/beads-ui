import { describe, expect, test, vi } from "vitest"
import { bootstrap } from "./main.ts"

// Polyfill <dialog> for jsdom
if (typeof HTMLDialogElement !== "undefined") {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void
    close?: () => void
  }
  if (typeof proto.showModal !== "function") {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "")
    }
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open")
    }
  }
}

// Capture calls and provide simple responses
const calls: Array<{ type: string; payload: unknown }> = []
const issues = [
  { id: "UI-10", title: "Existing", status: "open", priority: 2 },
  { id: "UI-200", title: "Create me", status: "open", priority: 1 },
]
vi.mock("./ws.ts", () => ({
  createWsClient: () => ({
    async send(type: string, payload: unknown) {
      // Record only mutation-related calls; list reads are push-only now
      if (type === "create-issue" || type === "label-add") {
        calls.push({ type, payload })
      }
      if (type === "list-issues") {
        // Provide data for legacy id-discovery path; do not record
        return issues
      }
      if (type === "create-issue") {
        return { created: true }
      }
      if (type === "label-add") {
        return issues[1]
      }
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

describe("UI-106 new issue flow", () => {
  test("button opens dialog", async () => {
    document.body.innerHTML =
      '<header class="app-header"><div class="header-actions"><button id="new-issue-btn">New issue</button></div></header><main id="app"></main>'
    const root = document.getElementById("app") as HTMLElement
    bootstrap(root)
    await Promise.resolve()
    const btn = document.getElementById("new-issue-btn") as HTMLButtonElement
    btn.click()
    await Promise.resolve()
    const dlg = document.getElementById("new-issue-dialog") as HTMLDialogElement
    expect(dlg).not.toBeNull()
    expect(dlg.hasAttribute("open")).toBe(true)
  })

  test("Ctrl+N opens dialog", async () => {
    document.body.innerHTML =
      '<header class="app-header"><div class="header-actions"><button id="new-issue-btn">New issue</button></div></header><main id="app"></main>'
    const root = document.getElementById("app") as HTMLElement
    bootstrap(root)
    await Promise.resolve()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", ctrlKey: true, bubbles: true }))
    await Promise.resolve()
    const dlg = document.getElementById("new-issue-dialog") as HTMLDialogElement
    expect(dlg.hasAttribute("open")).toBe(true)
  })

  test("submit creates issue and navigates to details", async () => {
    calls.length = 0
    document.body.innerHTML =
      '<header class="app-header"><div class="header-actions"><button id="new-issue-btn">New issue</button></div></header><main id="app"></main>'
    const root = document.getElementById("app") as HTMLElement
    bootstrap(root)
    await Promise.resolve()

    // Open dialog
    const btn = document.getElementById("new-issue-btn") as HTMLButtonElement
    btn.click()
    await Promise.resolve()

    // Fill form
    const title = document.getElementById("new-title") as HTMLInputElement
    const labels = document.getElementById("new-labels") as HTMLInputElement
    title.value = "Create me"
    labels.value = "alpha, beta"

    // Submit via Ctrl+Enter
    const dlg = document.getElementById("new-issue-dialog") as HTMLDialogElement
    dlg.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
      }),
    )
    await Promise.resolve()
    await Promise.resolve()
    await new Promise(r => setTimeout(r, 0))

    // Expect create call and label-add
    const types = calls.map(c => c.type)
    expect(types).toContain("create-issue")
    expect(types).toContain("label-add")

    // Details dialog opened for created id
    const details = document.getElementById("issue-dialog") as HTMLDialogElement
    expect(details).not.toBeNull()
    expect(details.hasAttribute("open")).toBe(true)
    const titleEl = document.getElementById("issue-dialog-title") as HTMLElement
    expect(titleEl.textContent).toBe("UI-200")
  })
})
