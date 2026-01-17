// @ts-nocheck
import { describe, expect, test } from "vitest"
import { createIssueDialog } from "./issue-dialog.ts"

// Provide a minimal dialog polyfill for jsdom environments
if (typeof HTMLDialogElement !== "undefined") {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void
    close?: () => void
  }
  if (typeof proto.showModal !== "function") {
    proto.showModal = function showModal() {
      this.setAttribute("open", "")
    }
    proto.close = function close() {
      this.removeAttribute("open")
    }
  }
}

describe("issue-dialog focus restoration", () => {
  test("restores focus to previously focused element after close", async () => {
    document.body.innerHTML = '<div id="mount"></div><button id="card">Card</button>'
    const mount = document.getElementById("mount") as HTMLElement
    const card_btn = document.getElementById("card") as HTMLButtonElement
    card_btn.focus()
    expect(document.activeElement).toBe(card_btn)

    const store = { getState: () => ({ selected_id: null }) }
    const dlg = createIssueDialog(mount, store as Parameters<typeof createIssueDialog>[1], () => {})
    dlg.open("UI-1")

    // Simulate closing the dialog
    dlg.close()

    // Focus returns to the previously focused element
    expect(document.activeElement).toBe(card_btn)
  })
})
