import { describe, expect, test, vi } from "vitest"
import { createDetailView } from "./detail.js"

describe("detail deps UI (UI-47)", () => {
  test("renders id, type and title for dependency items", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue = {
      id: "UI-100",
      title: "Parent",
      dependencies: [
        { id: "UI-1", issue_type: "feature", title: "Alpha" },
        { id: "UI-2", issue_type: "bug", title: "Beta" },
      ],
      dependents: [{ id: "UI-3", issue_type: "task", title: "Gamma" }],
    }

    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-100" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const view = createDetailView(mount, async () => ({}), undefined, stores)

    await view.load("UI-100")

    const text = mount.textContent || ""
    expect(text).toContain("Alpha")
    expect(text).toContain("Gamma")
    const badges = mount.querySelectorAll("ul .type-badge")
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  test("clicking a dependency row triggers navigation", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement
    const navs: string[] = []
    const current = {
      id: "UI-200",
      dependencies: [{ id: "UI-9", issue_type: "feature", title: "Z" }],
      dependents: [],
    }
    const stores2 = {
      snapshotFor(id: string) {
        return id === "detail:UI-200" ? [current] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = vi.fn().mockResolvedValue(current)
    const view = createDetailView(mount, send, hash => navs.push(hash), stores2)

    await view.load("UI-200")

    const row = mount.querySelector("ul li") as HTMLLIElement
    row.click()
    expect(navs[navs.length - 1]).toBe("#/issues?issue=UI-9")
  })

  test("add input is placed at the bottom of the section", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement
    const current2 = { id: "UI-300", dependencies: [], dependents: [] }
    const stores3 = {
      snapshotFor(id: string) {
        return id === "detail:UI-300" ? [current2] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = vi.fn().mockResolvedValue(current2)
    const view = createDetailView(mount, send, undefined, stores3)
    await view.load("UI-300")

    const input = mount.querySelector('[data-testid="add-dependency"]') as HTMLInputElement
    expect(input).toBeTruthy()
    const prev = input.parentElement?.previousElementSibling
    // Expect the add controls to follow the list (ul)
    expect(prev && prev.tagName).toBe("UL")
  })
})
