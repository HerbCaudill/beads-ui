import { beforeEach, describe, expect, test } from "vitest"
import { createHashRouter, parseHash, parseView, type RouterStore } from "./router.ts"
import { useAppStore } from "./store/index.ts"

/**
 * Create a RouterStore adapter for the Zustand store.
 */
function createRouterStore(): RouterStore {
  return {
    getState: () => {
      const state = useAppStore.getState()
      return { selected_id: state.selected_id, view: state.view }
    },
    setState: patch => {
      const actions = useAppStore.getState()
      if (patch.selected_id !== undefined) {
        actions.setSelectedId(patch.selected_id)
      }
      if (patch.view !== undefined) {
        actions.setView(patch.view)
      }
    },
  }
}

describe("router", () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAppStore.setState({
      selected_id: null,
      view: "issues",
      filters: { status: "all", search: "", type: "" },
      board: { closed_filter: "today" },
      workspace: { current: null, available: [] },
    })
    // Reset hash
    window.location.hash = ""
  })

  test("parseHash extracts id", () => {
    expect(parseHash("#/issues?issue=UI-5")).toBe("UI-5")
    expect(parseHash("#/issue/UI-5")).toBe("UI-5")
    expect(parseHash("#/anything")).toBeNull()
  })

  test("router updates store and gotoIssue updates hash", () => {
    document.body.innerHTML = "<div></div>"
    const store = createRouterStore()
    const router = createHashRouter(store)
    router.start()

    window.location.hash = "#/issue/UI-10"
    // Trigger handler synchronously
    window.dispatchEvent(new HashChangeEvent("hashchange"))
    expect(store.getState().selected_id).toBe("UI-10")

    router.gotoIssue("UI-11")
    expect(window.location.hash).toBe("#/issues?issue=UI-11")
    router.stop()
  })

  test("parseView resolves from hash and defaults to issues", () => {
    expect(parseView("#/issues")).toBe("issues")
    expect(parseView("#/epics")).toBe("epics")
    expect(parseView("#/board")).toBe("board")
    expect(parseView("")).toBe("issues")
    expect(parseView("#/unknown")).toBe("issues")
  })
})
