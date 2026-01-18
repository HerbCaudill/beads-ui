/**
 * Tests for the FilterBar React component.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { FilterBar } from "./FilterBar.js"
import { useAppStore } from "../store/index.js"

describe("FilterBar", () => {
  beforeEach(() => {
    // Reset store to default state
    useAppStore.setState({
      filters: {
        status: "all",
        search: "",
        type: "",
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders status filter dropdown", () => {
      render(<FilterBar />)
      expect(screen.getByText("Status: Any")).toBeDefined()
    })

    it("renders type filter dropdown", () => {
      render(<FilterBar />)
      expect(screen.getByText("Types: Any")).toBeDefined()
    })

    it("renders search input", () => {
      render(<FilterBar />)
      expect(screen.getByPlaceholderText("Search…")).toBeDefined()
    })

    it("has panel__header class", () => {
      const { container } = render(<FilterBar />)
      expect(container.querySelector(".panel__header")).toBeDefined()
    })

    it("applies testId when provided", () => {
      render(<FilterBar testId="filter-bar" />)
      expect(screen.getByTestId("filter-bar")).toBeDefined()
    })
  })

  describe("status filter", () => {
    it("shows status options when dropdown is opened", () => {
      render(<FilterBar />)

      fireEvent.click(screen.getByText("Status: Any"))

      expect(screen.getByText("Ready")).toBeDefined()
      expect(screen.getByText("Open")).toBeDefined()
      expect(screen.getByText("In progress")).toBeDefined()
      expect(screen.getByText("Closed")).toBeDefined()
    })

    it("toggles status filter on checkbox change", () => {
      render(<FilterBar />)

      // Open dropdown
      fireEvent.click(screen.getByText("Status: Any"))

      // Find and click the "Open" checkbox
      const openCheckbox = screen.getByLabelText("Open")
      fireEvent.click(openCheckbox)

      // Check store was updated
      const filters = useAppStore.getState().filters
      expect(filters.status).toContain("open")
    })

    it("displays selected status in trigger", () => {
      useAppStore.setState({
        filters: {
          status: ["open"] as unknown as "open",
          search: "",
          type: "",
        },
      })

      render(<FilterBar />)

      expect(screen.getByText("Status: Open")).toBeDefined()
    })

    it("shows count when multiple statuses selected", () => {
      useAppStore.setState({
        filters: {
          status: ["open", "closed"] as unknown as "open",
          search: "",
          type: "",
        },
      })

      render(<FilterBar />)

      expect(screen.getByText("Status (2)")).toBeDefined()
    })

    it("removes status from filter when unchecked", () => {
      useAppStore.setState({
        filters: {
          status: ["open", "closed"] as unknown as "open",
          search: "",
          type: "",
        },
      })

      render(<FilterBar />)

      // Open dropdown and uncheck "open"
      fireEvent.click(screen.getByText("Status (2)"))
      const openCheckbox = screen.getByLabelText("Open")
      fireEvent.click(openCheckbox)

      // Check store was updated - should only have "closed" now
      const filters = useAppStore.getState().filters
      expect(filters.status).toContain("closed")
      expect(filters.status).not.toContain("open")
    })

    it("closes status dropdown when type dropdown opens", () => {
      render(<FilterBar />)

      // Open status dropdown
      fireEvent.click(screen.getByText("Status: Any"))
      expect(
        screen.getByText("Status: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(true)

      // Open type dropdown
      fireEvent.click(screen.getByText("Types: Any"))

      // Status dropdown should be closed
      expect(
        screen.getByText("Status: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(false)
    })
  })

  describe("type filter", () => {
    it("shows type options when dropdown is opened", () => {
      render(<FilterBar />)

      fireEvent.click(screen.getByText("Types: Any"))

      expect(screen.getByText("Bug")).toBeDefined()
      expect(screen.getByText("Feature")).toBeDefined()
      expect(screen.getByText("Task")).toBeDefined()
      expect(screen.getByText("Epic")).toBeDefined()
      expect(screen.getByText("Chore")).toBeDefined()
    })

    it("toggles type filter on checkbox change", () => {
      render(<FilterBar />)

      // Open dropdown
      fireEvent.click(screen.getByText("Types: Any"))

      // Find and click the "Bug" checkbox
      const bugCheckbox = screen.getByLabelText("Bug")
      fireEvent.click(bugCheckbox)

      // Check store was updated
      const filters = useAppStore.getState().filters
      expect(filters.type).toContain("bug")
    })

    it("displays selected type in trigger", () => {
      useAppStore.setState({
        filters: {
          status: "all",
          search: "",
          type: ["bug"] as unknown as string,
        },
      })

      render(<FilterBar />)

      expect(screen.getByText("Types: Bug")).toBeDefined()
    })

    it("shows count when multiple types selected", () => {
      useAppStore.setState({
        filters: {
          status: "all",
          search: "",
          type: ["bug", "feature"] as unknown as string,
        },
      })

      render(<FilterBar />)

      expect(screen.getByText("Types (2)")).toBeDefined()
    })

    it("closes type dropdown when status dropdown opens", () => {
      render(<FilterBar />)

      // Open type dropdown
      fireEvent.click(screen.getByText("Types: Any"))
      expect(
        screen.getByText("Types: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(true)

      // Open status dropdown
      fireEvent.click(screen.getByText("Status: Any"))

      // Type dropdown should be closed
      expect(
        screen.getByText("Types: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(false)
    })
  })

  describe("search", () => {
    it("updates store on search input", () => {
      render(<FilterBar />)

      const searchInput = screen.getByPlaceholderText("Search…")
      fireEvent.change(searchInput, { target: { value: "test query" } })

      expect(useAppStore.getState().filters.search).toBe("test query")
    })

    it("reflects search value from store", () => {
      useAppStore.setState({
        filters: {
          status: "all",
          search: "existing search",
          type: "",
        },
      })

      render(<FilterBar />)

      const searchInput = screen.getByPlaceholderText("Search…") as HTMLInputElement
      expect(searchInput.value).toBe("existing search")
    })

    it("has aria-label for accessibility", () => {
      render(<FilterBar />)
      expect(screen.getByLabelText("Search issues")).toBeDefined()
    })
  })

  describe("click outside", () => {
    it("closes status dropdown on click outside", async () => {
      render(<FilterBar />)

      // Open status dropdown
      fireEvent.click(screen.getByText("Status: Any"))
      expect(
        screen.getByText("Status: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(true)

      // Click outside
      fireEvent.click(document.body)

      // Dropdown should be closed
      expect(
        screen.getByText("Status: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(false)
    })

    it("closes type dropdown on click outside", () => {
      render(<FilterBar />)

      // Open type dropdown
      fireEvent.click(screen.getByText("Types: Any"))
      expect(
        screen.getByText("Types: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(true)

      // Click outside
      fireEvent.click(document.body)

      // Dropdown should be closed
      expect(
        screen.getByText("Types: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(false)
    })

    it("does not close dropdown when clicking inside", () => {
      render(<FilterBar />)

      // Open status dropdown
      fireEvent.click(screen.getByText("Status: Any"))

      // Click inside the dropdown menu
      const menu = screen.getByText("Open").closest(".filter-dropdown__menu")!
      fireEvent.click(menu)

      // Dropdown should still be open
      expect(
        screen.getByText("Status: Any").closest(".filter-dropdown")?.classList.contains("is-open"),
      ).toBe(true)
    })
  })

  describe("accessibility", () => {
    it("status dropdown trigger has aria-expanded", () => {
      render(<FilterBar />)

      const trigger = screen.getByText("Status: Any").closest("button")!
      expect(trigger.getAttribute("aria-expanded")).toBe("false")

      fireEvent.click(trigger)
      expect(trigger.getAttribute("aria-expanded")).toBe("true")
    })

    it("type dropdown trigger has aria-expanded", () => {
      render(<FilterBar />)

      const trigger = screen.getByText("Types: Any").closest("button")!
      expect(trigger.getAttribute("aria-expanded")).toBe("false")

      fireEvent.click(trigger)
      expect(trigger.getAttribute("aria-expanded")).toBe("true")
    })

    it("dropdown triggers have aria-haspopup", () => {
      render(<FilterBar />)

      const statusTrigger = screen.getByText("Status: Any").closest("button")!
      const typeTrigger = screen.getByText("Types: Any").closest("button")!

      expect(statusTrigger.getAttribute("aria-haspopup")).toBe("listbox")
      expect(typeTrigger.getAttribute("aria-haspopup")).toBe("listbox")
    })

    it("dropdown menus have role listbox", () => {
      render(<FilterBar />)

      // Open both dropdowns to make menus visible
      fireEvent.click(screen.getByText("Status: Any"))

      const menus = document.querySelectorAll('[role="listbox"]')
      expect(menus.length).toBeGreaterThan(0)
    })
  })
})
