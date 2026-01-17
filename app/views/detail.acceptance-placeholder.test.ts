import { describe, expect, test } from "vitest"
import { createDetailView } from "./detail.js"
import type { IssueStores } from "../data/list-selectors.js"

describe("views/detail acceptance placeholder", () => {
  test("shows placeholder and allows entering edit mode when empty", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue: Record<string, unknown> = {
      id: "UI-200",
      title: "Empty acceptance",
      acceptance: "",
      acceptance_criteria: "",
      status: "open",
      priority: 2,
    }

    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-200" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const view = createDetailView(
      mount,
      async (type, payload) => {
        if (type === "edit-text") {
          const f = (payload as { field: string }).field
          const v = (payload as { value: string }).value
          expect(f).toBe("acceptance")
          issue[f] = v
          return issue
        }
        throw new Error("Unexpected: " + type)
      },
      undefined,
      stores as unknown as IssueStores,
    )

    await view.load("UI-200")

    // Heading should be omitted when empty
    expect(mount.querySelector(".acceptance .props-card__title")).toBeNull()
    // Placeholder is visible
    const ph = mount.querySelector(".acceptance .muted")
    expect(ph && (ph.textContent || "")).toContain("Add acceptance criteria")

    // Click to enter edit mode
    const editable = mount.querySelector(".acceptance .editable") as HTMLDivElement
    editable.click()
    const ta = mount.querySelector(".acceptance textarea") as HTMLTextAreaElement
    expect(ta).toBeTruthy()
    ta.value = "Step 1"

    // Save via Cmd/Ctrl+Enter
    const key = new KeyboardEvent("keydown", { key: "Enter", metaKey: true })
    ta.dispatchEvent(key)
    await Promise.resolve()

    // Back to read mode, content rendered
    const md = mount.querySelector(".acceptance .md") as HTMLDivElement
    expect(md && (md.textContent || "")).toContain("Step 1")
  })
})
