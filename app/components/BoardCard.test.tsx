/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { IssueLite } from "../../types/issues.js"
import { BoardCard } from "./BoardCard.js"

describe("BoardCard", () => {
  const mock_issue: IssueLite = {
    id: "UI-123",
    title: "Test Issue",
    issue_type: "bug",
    priority: 1,
  }

  let navigate_spy: (id: string) => void

  beforeEach(() => {
    navigate_spy = vi.fn() as (id: string) => void
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders issue title", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    expect(screen.getByText("Test Issue")).toBeDefined()
  })

  it("renders type badge", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    const badge = screen.getByRole("img", { name: /issue type/i })
    expect(badge).toBeDefined()
  })

  it("renders priority badge", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    const badge = screen.getByRole("img", { name: /priority/i })
    expect(badge).toBeDefined()
  })

  it("renders issue ID button", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    const id_button = screen.getByRole("button", { name: /copy issue id/i })
    expect(id_button).toBeDefined()
    expect(id_button.textContent).toBe("UI-123")
  })

  it("calls onNavigate when clicked", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    const card = screen.getByRole("listitem")
    fireEvent.click(card)

    expect(navigate_spy).toHaveBeenCalledWith("UI-123")
  })

  it("shows placeholder for missing title", () => {
    const issue_no_title: IssueLite = { id: "UI-456" }

    render(<BoardCard issue={issue_no_title} onNavigate={navigate_spy} />)

    expect(screen.getByText("(no title)")).toBeDefined()
  })

  it("is draggable", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    const card = screen.getByRole("listitem")
    expect(card.getAttribute("draggable")).toBe("true")
  })

  it("sets data transfer on drag start", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    const card = screen.getByRole("listitem")

    const data_transfer = {
      setData: vi.fn(),
      effectAllowed: "",
    }

    fireEvent.dragStart(card, { dataTransfer: data_transfer })

    expect(data_transfer.setData).toHaveBeenCalledWith("text/plain", "UI-123")
    expect(data_transfer.effectAllowed).toBe("move")
  })

  it("has accessible aria-label", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    const card = screen.getByRole("listitem")
    expect(card.getAttribute("aria-label")).toBe("Issue Test Issue")
  })

  it("has data-issue-id attribute", () => {
    render(<BoardCard issue={mock_issue} onNavigate={navigate_spy} />)

    const card = screen.getByRole("listitem")
    expect(card.getAttribute("data-issue-id")).toBe("UI-123")
  })
})
