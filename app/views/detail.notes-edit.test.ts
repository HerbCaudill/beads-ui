import { describe, expect, test } from "vitest"
import { createDetailView } from "./detail.js"
import type { IssueStores } from "../data/list-selectors.js"

describe("views/detail notes edit", () => {
  test("enables editing, saves, and persists notes", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue: Record<string, unknown> = {
      id: "UI-117",
      title: "Notes editable",
      description: "",
      notes: "",
      status: "open",
      priority: 2,
    }

    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-117" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const view = createDetailView(
      mount,
      async (type, payload) => {
        if (type === "edit-text") {
          // Expect notes field update
          const f = (payload as { field: string }).field
          const v = (payload as { value: string }).value
          expect(f).toBe("notes")
          issue[f] = v
          return issue
        }
        throw new Error("Unexpected type: " + type)
      },
      undefined,
      stores as unknown as IssueStores,
    )

    await view.load("UI-117")

    // Placeholder visible when empty
    const placeholder = mount.querySelector(".notes .muted")
    expect(placeholder && (placeholder.textContent || "")).toContain("Add notes")

    // Enter edit mode by clicking editable block
    const editable = mount.querySelector(".notes .editable") as HTMLDivElement
    editable.click()

    const ta = mount.querySelector(".notes textarea") as HTMLTextAreaElement
    expect(ta).toBeTruthy()
    ta.value = "New notes text"

    // Save via Ctrl+Enter
    const key = new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true })
    ta.dispatchEvent(key)
    await Promise.resolve()

    // Back to read mode with markdown rendering
    const md = mount.querySelector(".notes .md") as HTMLDivElement
    expect(md && (md.textContent || "")).toContain("New notes text")
  })
})
