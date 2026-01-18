import { describe, expect, test, vi } from "vitest"
import { bootstrap } from "./main-lit.ts"

// Provide a minimal dialog polyfill for jsdom environments
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

vi.mock("./ws.ts", () => ({
  createWsClient: () => ({
    async send() {
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

describe("UI-104 dialog opens on navigation", () => {
  test("hash navigation opens modal dialog and keeps list visible", async () => {
    // Start on issues
    window.location.hash = "#/issues"
    document.body.innerHTML = '<main id="app"></main>'
    const root = document.getElementById("app") as HTMLElement

    bootstrap(root)

    await Promise.resolve()
    await Promise.resolve()

    // Navigate to an issue
    window.location.hash = "#/issue/UI-1"
    window.dispatchEvent(new HashChangeEvent("hashchange"))
    await Promise.resolve()
    await Promise.resolve()

    const dlg = document.getElementById("issue-dialog") as HTMLDialogElement
    expect(dlg).not.toBeNull()
    const title = document.getElementById("issue-dialog-title") as HTMLElement
    expect(title.textContent).toBe("UI-1")

    // Underlying list remains visible
    const issuesRoot = document.getElementById("issues-root") as HTMLElement
    expect(issuesRoot.hidden).toBe(false)

    // Close via button
    const btn = dlg.querySelector(".issue-dialog__close") as HTMLButtonElement
    btn.click()
    await Promise.resolve()

    expect(dlg.hasAttribute("open")).toBe(false)
    expect(window.location.hash).toBe("#/issues")
  })
})
