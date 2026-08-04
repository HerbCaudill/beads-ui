import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SearchSuggestions } from "../SearchSuggestions"

describe("SearchSuggestions", () => {
  it("scrolls the active option into view", () => {
    const scrollIntoView = vi.fn()
    const originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView

    try {
      const { rerender } = render(
        <SearchSuggestions
          id="suggestions"
          suggestions={["status:open", "status:closed"]}
          activeIndex={-1}
          onActiveIndexChange={vi.fn()}
          onSelect={vi.fn()}
        />,
      )

      rerender(
        <SearchSuggestions
          id="suggestions"
          suggestions={["status:open", "status:closed"]}
          activeIndex={1}
          onActiveIndexChange={vi.fn()}
          onSelect={vi.fn()}
        />,
      )

      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" })
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
    }
  })

  it("selects an option through its click event", () => {
    const onSelect = vi.fn()
    render(
      <SearchSuggestions
        id="suggestions"
        suggestions={["status:open"]}
        activeIndex={-1}
        onActiveIndexChange={vi.fn()}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole("option", { name: "status:open" }))

    expect(onSelect).toHaveBeenCalledWith("status:open")
  })
})
