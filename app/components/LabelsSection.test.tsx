/**
 * @vitest-environment jsdom
 *
 * Tests for the LabelsSection React component.
 */
import { cleanup, render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { LabelsSection } from "./LabelsSection.js"
import { DetailContext, type DetailContextValue } from "./DetailView.js"
import type { IssueDetail } from "../../types/issues.js"

/**
 * Create a mock issue for testing.
 */
function createMockIssue(overrides: Partial<IssueDetail> = {}): IssueDetail {
  return {
    id: "test-1",
    title: "Test Issue",
    description: "Test description",
    status: "open",
    priority: 2,
    issue_type: "bug",
    assignee: "alice",
    labels: ["frontend", "backend"],
    dependencies: [],
    dependents: [],
    comments: [],
    ...overrides,
  }
}

/**
 * Wrapper component that provides the DetailContext.
 */
function renderWithContext(ui: React.ReactElement, contextValue: Partial<DetailContextValue> = {}) {
  const mockTransport = vi.fn().mockResolvedValue(undefined)
  const mockNavigate = vi.fn()

  const value: DetailContextValue = {
    issue: createMockIssue(),
    loading: false,
    transport: mockTransport,
    onNavigate: mockNavigate,
    ...contextValue,
  }

  return {
    ...render(<DetailContext.Provider value={value}>{ui}</DetailContext.Provider>),
    mockTransport,
    mockNavigate,
  }
}

describe("LabelsSection", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders with testId when provided", () => {
      renderWithContext(<LabelsSection labels={["test"]} testId="labels-section" />)

      expect(screen.getByTestId("labels-section")).toBeDefined()
    })

    it("renders Labels title", () => {
      renderWithContext(<LabelsSection labels={[]} />)

      expect(screen.getByText("Labels")).toBeDefined()
    })

    it("renders all provided labels", () => {
      renderWithContext(<LabelsSection labels={["frontend", "backend", "urgent"]} />)

      expect(screen.getByText("frontend")).toBeDefined()
      expect(screen.getByText("backend")).toBeDefined()
      expect(screen.getByText("urgent")).toBeDefined()
    })

    it("renders labels as badges", () => {
      renderWithContext(<LabelsSection labels={["test"]} />)

      const badge = screen.getByText("test").closest(".badge")
      expect(badge).toBeDefined()
    })

    it("renders remove button for each label", () => {
      renderWithContext(<LabelsSection labels={["frontend", "backend"]} />)

      const removeButtons = screen.getAllByRole("button", { name: /Remove label/ })
      expect(removeButtons).toHaveLength(2)
    })

    it("renders input field for adding labels", () => {
      renderWithContext(<LabelsSection labels={[]} />)

      expect(screen.getByPlaceholderText("Label")).toBeDefined()
    })

    it("renders Add button", () => {
      renderWithContext(<LabelsSection labels={[]} />)

      expect(screen.getByRole("button", { name: "Add" })).toBeDefined()
    })

    it("renders empty list when no labels provided", () => {
      renderWithContext(<LabelsSection labels={[]} />)

      expect(screen.queryByRole("button", { name: /Remove label/ })).toBeNull()
    })
  })

  describe("adding labels", () => {
    it("calls transport when Add button is clicked", async () => {
      const { mockTransport } = renderWithContext(<LabelsSection labels={[]} />)

      const input = screen.getByPlaceholderText("Label")
      fireEvent.change(input, { target: { value: "new-label" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("label-add", {
        id: "test-1",
        label: "new-label",
      })
    })

    it("calls transport when Enter is pressed in input", async () => {
      const { mockTransport } = renderWithContext(<LabelsSection labels={[]} />)

      const input = screen.getByPlaceholderText("Label")
      fireEvent.change(input, { target: { value: "new-label" } })

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      expect(mockTransport).toHaveBeenCalledWith("label-add", {
        id: "test-1",
        label: "new-label",
      })
    })

    it("clears input after successful add", async () => {
      renderWithContext(<LabelsSection labels={[]} />)

      const input = screen.getByPlaceholderText("Label") as HTMLInputElement
      fireEvent.change(input, { target: { value: "new-label" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(input.value).toBe("")
    })

    it("does not call transport when input is empty", async () => {
      const { mockTransport } = renderWithContext(<LabelsSection labels={[]} />)

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("does not call transport when input is only whitespace", async () => {
      const { mockTransport } = renderWithContext(<LabelsSection labels={[]} />)

      const input = screen.getByPlaceholderText("Label")
      fireEvent.change(input, { target: { value: "   " } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("trims whitespace from label before adding", async () => {
      const { mockTransport } = renderWithContext(<LabelsSection labels={[]} />)

      const input = screen.getByPlaceholderText("Label")
      fireEvent.change(input, { target: { value: "  new-label  " } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("label-add", {
        id: "test-1",
        label: "new-label",
      })
    })

    it("disables input while pending", async () => {
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithContext(<LabelsSection labels={[]} />, { transport: mockTransport })

      const input = screen.getByPlaceholderText("Label") as HTMLInputElement
      fireEvent.change(input, { target: { value: "new-label" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(input.disabled).toBe(true)
    })

    it("disables Add button while pending", async () => {
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithContext(<LabelsSection labels={[]} />, { transport: mockTransport })

      const input = screen.getByPlaceholderText("Label")
      fireEvent.change(input, { target: { value: "new-label" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect((screen.getByRole("button", { name: "Add" }) as HTMLButtonElement).disabled).toBe(true)
    })

    it("handles transport error gracefully", async () => {
      const mockTransport = vi.fn().mockRejectedValue(new Error("Network error"))
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithContext(<LabelsSection labels={[]} />, { transport: mockTransport })

      const input = screen.getByPlaceholderText("Label")
      fireEvent.change(input, { target: { value: "new-label" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      // Should not throw and input should be re-enabled
      await waitFor(() => {
        expect((screen.getByPlaceholderText("Label") as HTMLInputElement).disabled).toBe(false)
      })

      consoleError.mockRestore()
    })
  })

  describe("removing labels", () => {
    it("calls transport when remove button is clicked", async () => {
      const { mockTransport } = renderWithContext(<LabelsSection labels={["frontend"]} />)

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove label frontend" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("label-remove", {
        id: "test-1",
        label: "frontend",
      })
    })

    it("disables remove buttons while pending", async () => {
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithContext(<LabelsSection labels={["frontend", "backend"]} />, {
        transport: mockTransport,
      })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove label frontend" }))
      })

      // All remove buttons should be disabled
      const removeButtons = screen.getAllByRole("button", { name: /Remove label/ })
      removeButtons.forEach(button => {
        expect((button as HTMLButtonElement).disabled).toBe(true)
      })
    })

    it("handles transport error gracefully", async () => {
      const mockTransport = vi.fn().mockRejectedValue(new Error("Network error"))
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithContext(<LabelsSection labels={["frontend"]} />, { transport: mockTransport })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove label frontend" }))
      })

      // Should not throw and buttons should be re-enabled
      await waitFor(() => {
        expect(
          (screen.getByRole("button", { name: "Remove label frontend" }) as HTMLButtonElement)
            .disabled,
        ).toBe(false)
      })

      consoleError.mockRestore()
    })
  })

  describe("edge cases", () => {
    it("handles null issue gracefully", async () => {
      const { mockTransport } = renderWithContext(<LabelsSection labels={["test"]} />, {
        issue: null,
      })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove label test" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("renders labels container even when empty", () => {
      const { container } = renderWithContext(<LabelsSection labels={[]} />)

      expect(container.querySelector(".labels")).toBeDefined()
    })
  })
})
