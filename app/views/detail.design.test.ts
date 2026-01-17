import { describe, expect, test } from "vitest"
import { createDetailView } from "./detail.js"
import type { IssueStores } from "../data/list-selectors.js"

function mountDiv() {
  const div = document.createElement("div")
  document.body.appendChild(div)
  return div
}

describe("detail view design section", () => {
  test("orders sections: Description → Design → Notes → Acceptance Criteria", async () => {
    const mount = mountDiv()
    const issue = {
      id: "UI-116",
      title: "Ordering test",
      description: "Some description",
      design: "",
      notes: "Some notes",
      acceptance_criteria: "- a", // also supports fallback field
    }
    const storesA = {
      snapshotFor(id: string) {
        return id === "detail:UI-116" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const view = createDetailView(
      mount,
      async () => ({}),
      undefined,
      storesA as unknown as IssueStores,
    )
    await view.load("UI-116")

    const main = mount.querySelector(".detail-main") as HTMLElement
    expect(main).toBeTruthy()
    const children = Array.from(main.children).filter(el => !el.classList.contains("detail-title"))
    const names = children.map(el => {
      if (el.classList.contains("design")) {
        return "design"
      }
      if (el.classList.contains("notes")) {
        return "notes"
      }
      if (el.classList.contains("acceptance")) {
        return "acceptance"
      }
      if (el.classList.contains("comments")) {
        return "comments"
      }
      return "description"
    })
    expect(names).toEqual(["description", "design", "notes", "acceptance", "comments"])
    // Heading text for acceptance should be updated
    const accTitle = mount.querySelector(".acceptance .props-card__title")
    expect(accTitle && accTitle.textContent).toBe("Acceptance Criteria")
  })

  test("editing Design updates field and persists after reload", async () => {
    const mount = mountDiv()
    let current: Record<string, unknown> = {
      id: "UI-116",
      title: "Design edit test",
      description: "X",
      design: "",
      notes: "",
      status: "open",
      priority: 2,
    }
    const storesB = {
      snapshotFor(id: string) {
        return id === "detail:UI-116" ? [current] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = async (type: string, payload?: unknown) => {
      if (type === "edit-text") {
        const p = payload as { field?: string; value?: string }
        if (p?.field === "design") {
          current = { ...current, design: p.value }
          return current
        }
        throw new Error("Unexpected field: " + p?.field)
      }
      throw new Error("Unexpected: " + type)
    }
    const view = createDetailView(mount, send, undefined, storesB as unknown as IssueStores)
    await view.load("UI-116")

    // Simulate edit-text result from server and reload to verify persistence
    await send("edit-text", {
      field: "design",
      value: "Proposed design\n\n- step 1",
    })
    await view.load("UI-116")
    const designDiv2 = mount.querySelector(".design") as HTMLDivElement
    expect(designDiv2 && (designDiv2.textContent || "")).toContain("Proposed design")
  })
})
