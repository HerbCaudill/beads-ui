import { describe, expect, test } from "vitest"
import { bootstrap } from "./main-lit.ts"

describe("app/main (jsdom)", () => {
  test("renders two-panel shell into root", () => {
    document.body.innerHTML = '<main id="app"></main>'
    const root_element = document.getElementById("app") as HTMLElement
    bootstrap(root_element)

    const list_panel = root_element.querySelector("#list-panel")
    const detail_panel = root_element.querySelector("#detail-panel")
    expect(list_panel).not.toBeNull()
    expect(detail_panel).not.toBeNull()
  })
})
