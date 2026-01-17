import { describe, expect, test, vi } from "vitest"
import { createTopNav } from "./nav.ts"

interface TestState {
  view: string
}

function setup() {
  document.body.innerHTML = '<div id="m"></div>'
  const mount = document.getElementById("m") as HTMLElement
  const store = {
    state: { view: "issues" } as TestState,
    getState() {
      return this.state
    },
    setState(v: Partial<TestState>) {
      this.state = { ...this.state, ...v }
    },
    subscribe(fn: (s: TestState) => void) {
      // simplistic subscription for test
      this._fn = fn
      return () => void 0
    },
    _fn: (() => {}) as (s: TestState) => void,
  }
  const router = { gotoView: vi.fn() }
  return { mount, store, router }
}

describe("views/nav", () => {
  test("renders and routes between tabs", async () => {
    const { mount, store, router } = setup()
    createTopNav(
      mount,
      store as unknown as Parameters<typeof createTopNav>[1],
      router as Parameters<typeof createTopNav>[2],
    )
    const links = mount.querySelectorAll("a.tab")
    expect(links.length).toBe(3)
    links[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(router.gotoView).toHaveBeenCalledWith("epics")
    links[2]!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(router.gotoView).toHaveBeenCalledWith("board")
  })
})
