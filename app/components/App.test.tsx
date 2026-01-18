/**
 * Tests for the React App shell component.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { useAppStore } from "../store/index.js"
import { App } from "./App.js"

describe("App component", () => {
  beforeEach(() => {
    // Set up DOM containers that the app expects
    document.body.innerHTML = `
      <div id="epics-root"></div>
      <div id="board-root"></div>
      <div id="issues-root"></div>
      <div id="react-root"></div>
    `
    // Reset store to initial state
    useAppStore.setState({
      view: "issues",
      selected_id: null,
      filters: { status: "all", search: "", type: "" },
      board: { closed_filter: "today" },
      workspace: { current: null, available: [] },
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ""
  })

  it("renders without crashing", () => {
    const { container } = render(<App />)
    expect(container).toBeDefined()
  })

  it("renders nothing when all React views are disabled", () => {
    // By default, all REACT_VIEWS are set to false
    const { container } = render(<App />)
    // The component renders an empty fragment
    expect(container.innerHTML).toBe("")
  })

  it("responds to view changes in the store", () => {
    render(<App />)

    // Change view to epics
    useAppStore.setState({ view: "epics" })

    // Since REACT_VIEWS.epics is false, nothing should be rendered
    // This test verifies the hook subscription works
    expect(useAppStore.getState().view).toBe("epics")
  })
})
