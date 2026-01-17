import { describe, expect, test, vi } from "vitest"
import { createDetailView } from "./detail.js"

const mockSend = (impl: (type: string, payload?: unknown) => Promise<unknown>) => vi.fn(impl)

describe("views/detail assignee edit", () => {
  test("edits assignee via Properties control", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue = {
      id: "UI-57",
      title: "Detail screen",
      description: "",
      status: "open",
      priority: 2,
      assignee: "alice",
      dependencies: [],
      dependents: [],
    }

    const stores1 = {
      snapshotFor(id: string) {
        return id === "detail:UI-57" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = mockSend(async (type, payload) => {
      if (type === "update-assignee") {
        expect(payload).toEqual({ id: "UI-57", assignee: "max" })
        const next = { ...issue, assignee: "max" }
        return next
      }
      throw new Error("Unexpected")
    })

    const view = createDetailView(mount, send, undefined, stores1)
    await view.load("UI-57")

    const assigneeSpan = mount.querySelector(
      "#detail-root .prop.assignee .value .editable",
    ) as HTMLSpanElement
    expect(assigneeSpan).toBeTruthy()
    expect(assigneeSpan.textContent).toBe("alice")

    assigneeSpan.click()
    const input = mount.querySelector("#detail-root .prop.assignee input") as HTMLInputElement
    const saveBtn = mount.querySelector("#detail-root .prop.assignee button") as HTMLButtonElement
    input.value = "max"
    saveBtn.click()

    await Promise.resolve()

    const assigneeSpan2 = mount.querySelector(
      "#detail-root .prop.assignee .value .editable",
    ) as HTMLSpanElement
    expect(assigneeSpan2.textContent).toBe("max")
  })

  test("shows editable placeholder when unassigned", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue = {
      id: "UI-88",
      title: "No assignee yet",
      description: "",
      status: "open",
      priority: 2,
      // no assignee field
      dependencies: [],
      dependents: [],
    }

    const stores2 = {
      snapshotFor(id: string) {
        return id === "detail:UI-88" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = mockSend(async (type, payload) => {
      if (type === "update-assignee") {
        const next = {
          ...issue,
          assignee: (payload as { assignee: string }).assignee,
        }
        return next
      }
      throw new Error("Unexpected")
    })

    const view = createDetailView(mount, send, undefined, stores2)
    await view.load("UI-88")

    const ph = mount.querySelector(
      "#detail-root .prop.assignee .value .editable",
    ) as HTMLSpanElement
    expect(ph).toBeTruthy()
    expect(ph.className).toContain("muted")
    expect(ph.textContent).toBe("Unassigned")

    ph.click()
    const input = mount.querySelector("#detail-root .prop.assignee input") as HTMLInputElement
    expect(input).toBeTruthy()
  })

  test("clears assignee to empty string and shows placeholder", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue = {
      id: "UI-31",
      title: "Clearable",
      status: "open",
      priority: 2,
      assignee: "bob",
      dependencies: [],
      dependents: [],
    }

    const stores3 = {
      snapshotFor(id: string) {
        return id === "detail:UI-31" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const send = mockSend(async (type, payload) => {
      if (type === "update-assignee") {
        const next = {
          ...issue,
          assignee: (payload as { assignee: string }).assignee,
        }
        return next
      }
      throw new Error("Unexpected")
    })

    const view = createDetailView(mount, send, undefined, stores3)
    await view.load("UI-31")

    const span = mount.querySelector(
      "#detail-root .prop.assignee .value .editable",
    ) as HTMLSpanElement
    span.click()
    const input = mount.querySelector("#detail-root .prop.assignee input") as HTMLInputElement
    const save = mount.querySelector("#detail-root .prop.assignee button") as HTMLButtonElement
    input.value = ""
    save.click()
    await Promise.resolve()
    const span2 = mount.querySelector(
      "#detail-root .prop.assignee .value .editable",
    ) as HTMLSpanElement
    expect(span2.textContent).toBe("Unassigned")
    expect(span2.className).toContain("muted")
  })
})
