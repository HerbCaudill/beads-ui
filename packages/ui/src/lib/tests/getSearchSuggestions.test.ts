import { describe, expect, it } from "vitest"

import { getSearchSuggestions } from "../getSearchSuggestions"

describe("getSearchSuggestions", () => {
  it("completes the active value after a comma", () => {
    expect(getSearchSuggestions("status:open,i")).toContain("status:open,in_progress")
    expect(getSearchSuggestions("priority:P0,")).toContain("priority:P0,P1")
    expect(getSearchSuggestions("-status:open,i")).toContain("-status:open,in_progress")
  })
})
