/**
 * @vitest-environment jsdom
 *
 * Tests for the Nav React component.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Nav } from "./Nav.js"
import { useAppStore } from "../store/index.js"

describe("Nav", () => {
  beforeEach(() => {
    // Reset store to default state
    useAppStore.setState({
      view: "issues",
    })
    // Reset location hash
    window.location.hash = ""
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders three navigation tabs", () => {
      render(<Nav />)
      expect(screen.getByText("Issues")).toBeDefined()
      expect(screen.getByText("Epics")).toBeDefined()
      expect(screen.getByText("Board")).toBeDefined()
    })

    it("has header-nav class", () => {
      const { container } = render(<Nav />)
      expect(container.querySelector(".header-nav")).toBeDefined()
    })

    it("has aria-label for accessibility", () => {
      const { container } = render(<Nav />)
      const nav = container.querySelector("nav")
      expect(nav?.getAttribute("aria-label")).toBe("Primary")
    })

    it("applies testId when provided", () => {
      render(<Nav testId="top-nav" />)
      expect(screen.getByTestId("top-nav")).toBeDefined()
      expect(screen.getByTestId("top-nav-issues")).toBeDefined()
      expect(screen.getByTestId("top-nav-epics")).toBeDefined()
      expect(screen.getByTestId("top-nav-board")).toBeDefined()
    })

    it("renders links with correct hrefs", () => {
      render(<Nav />)
      expect(screen.getByText("Issues").closest("a")?.getAttribute("href")).toBe("#/issues")
      expect(screen.getByText("Epics").closest("a")?.getAttribute("href")).toBe("#/epics")
      expect(screen.getByText("Board").closest("a")?.getAttribute("href")).toBe("#/board")
    })
  })

  describe("active state", () => {
    it("marks issues tab as active when view is issues", () => {
      useAppStore.setState({ view: "issues" })
      render(<Nav />)
      expect(screen.getByText("Issues").className).toContain("active")
      expect(screen.getByText("Epics").className).not.toContain("active")
      expect(screen.getByText("Board").className).not.toContain("active")
    })

    it("marks epics tab as active when view is epics", () => {
      useAppStore.setState({ view: "epics" })
      render(<Nav />)
      expect(screen.getByText("Issues").className).not.toContain("active")
      expect(screen.getByText("Epics").className).toContain("active")
      expect(screen.getByText("Board").className).not.toContain("active")
    })

    it("marks board tab as active when view is board", () => {
      useAppStore.setState({ view: "board" })
      render(<Nav />)
      expect(screen.getByText("Issues").className).not.toContain("active")
      expect(screen.getByText("Epics").className).not.toContain("active")
      expect(screen.getByText("Board").className).toContain("active")
    })
  })

  describe("navigation", () => {
    it("updates hash when issues tab is clicked", () => {
      useAppStore.setState({ view: "board" })
      render(<Nav />)
      fireEvent.click(screen.getByText("Issues"))
      expect(window.location.hash).toBe("#/issues")
    })

    it("updates hash when epics tab is clicked", () => {
      useAppStore.setState({ view: "issues" })
      render(<Nav />)
      fireEvent.click(screen.getByText("Epics"))
      expect(window.location.hash).toBe("#/epics")
    })

    it("updates hash when board tab is clicked", () => {
      useAppStore.setState({ view: "issues" })
      render(<Nav />)
      fireEvent.click(screen.getByText("Board"))
      expect(window.location.hash).toBe("#/board")
    })

    it("prevents default link behavior on click", () => {
      render(<Nav />)
      const link = screen.getByText("Epics")
      const event = new MouseEvent("click", { bubbles: true, cancelable: true })
      const preventDefaultSpy = vi.spyOn(event, "preventDefault")
      link.dispatchEvent(event)
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe("reactivity", () => {
    it("updates active tab when store changes", () => {
      const { rerender } = render(<Nav />)

      // Initially issues is active
      expect(screen.getByText("Issues").className).toContain("active")

      // Update store to epics
      useAppStore.setState({ view: "epics" })
      rerender(<Nav />)

      // Now epics should be active
      expect(screen.getByText("Epics").className).toContain("active")
      expect(screen.getByText("Issues").className).not.toContain("active")
    })
  })
})
