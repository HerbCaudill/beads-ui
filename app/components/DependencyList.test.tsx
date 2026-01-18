/**
 * Tests for the DependencyList React component.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest"

import { DependencyList } from "./DependencyList.js"
import { DetailContext, type DetailContextValue } from "./DetailView.js"
import type { IssueDetail, DependencyRef } from "../../types/issues.js"

// Mock the toast module
vi.mock("../utils/toast.js", () => ({
  showToast: vi.fn(),
}))

import { showToast } from "../utils/toast.js"

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
    labels: [],
    dependencies: [],
    dependents: [],
    comments: [],
    ...overrides,
  }
}

/**
 * Create a mock dependency reference.
 */
function createMockDep(overrides: Partial<DependencyRef> = {}): DependencyRef {
  return {
    id: "dep-1",
    title: "Dependency Issue",
    issue_type: "task",
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

describe("DependencyList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders with testId when provided", () => {
      renderWithContext(<DependencyList title="Dependencies" items={[]} testId="deps-section" />)

      expect(screen.getByTestId("deps-section")).toBeDefined()
    })

    it("renders Dependencies title", () => {
      renderWithContext(<DependencyList title="Dependencies" items={[]} />)

      expect(screen.getByText("Dependencies")).toBeDefined()
    })

    it("renders Dependents title", () => {
      renderWithContext(<DependencyList title="Dependents" items={[]} />)

      expect(screen.getByText("Dependents")).toBeDefined()
    })

    it("renders all provided dependency items", () => {
      const items: DependencyRef[] = [
        createMockDep({ id: "dep-1", title: "First Issue" }),
        createMockDep({ id: "dep-2", title: "Second Issue" }),
        createMockDep({ id: "dep-3", title: "Third Issue" }),
      ]

      renderWithContext(<DependencyList title="Dependencies" items={items} />)

      expect(screen.getByText("First Issue")).toBeDefined()
      expect(screen.getByText("Second Issue")).toBeDefined()
      expect(screen.getByText("Third Issue")).toBeDefined()
    })

    it("renders type badges for items", () => {
      const items: DependencyRef[] = [createMockDep({ id: "dep-1", issue_type: "bug" })]

      const { container } = renderWithContext(<DependencyList title="Dependencies" items={items} />)

      const badge = container.querySelector(".type-badge--bug")
      expect(badge).toBeDefined()
    })

    it("renders remove button for each item", () => {
      const items: DependencyRef[] = [
        createMockDep({ id: "dep-1" }),
        createMockDep({ id: "dep-2" }),
      ]

      renderWithContext(<DependencyList title="Dependencies" items={items} />)

      expect(screen.getByRole("button", { name: "Remove dependency dep-1" })).toBeDefined()
      expect(screen.getByRole("button", { name: "Remove dependency dep-2" })).toBeDefined()
    })

    it("renders input field for adding dependencies", () => {
      renderWithContext(<DependencyList title="Dependencies" items={[]} />)

      expect(screen.getByPlaceholderText("Issue ID")).toBeDefined()
    })

    it("renders correct test ID for Dependencies input", () => {
      renderWithContext(<DependencyList title="Dependencies" items={[]} />)

      expect(screen.getByTestId("add-dependency")).toBeDefined()
    })

    it("renders correct test ID for Dependents input", () => {
      renderWithContext(<DependencyList title="Dependents" items={[]} />)

      expect(screen.getByTestId("add-dependent")).toBeDefined()
    })

    it("renders Add button", () => {
      renderWithContext(<DependencyList title="Dependencies" items={[]} />)

      expect(screen.getByRole("button", { name: "Add" })).toBeDefined()
    })

    it("renders empty list when no items provided", () => {
      renderWithContext(<DependencyList title="Dependencies" items={[]} />)

      expect(screen.queryByRole("button", { name: /Remove dependency/ })).toBeNull()
    })

    it("shows issue ID when title is missing", () => {
      const items: DependencyRef[] = [{ id: "dep-1" }]

      renderWithContext(<DependencyList title="Dependencies" items={items} />)

      expect(screen.getByText("dep-1")).toBeDefined()
    })
  })

  describe("adding dependencies", () => {
    it("calls transport with correct params for Dependencies", async () => {
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={[]} />,
      )

      const input = screen.getByTestId("add-dependency")
      fireEvent.change(input, { target: { value: "UI-2" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("dep-add", {
        a: "test-1",
        b: "UI-2",
        view_id: "test-1",
      })
    })

    it("calls transport with correct params for Dependents", async () => {
      const { mockTransport } = renderWithContext(<DependencyList title="Dependents" items={[]} />)

      const input = screen.getByTestId("add-dependent")
      fireEvent.change(input, { target: { value: "UI-3" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("dep-add", {
        a: "UI-3",
        b: "test-1",
        view_id: "test-1",
      })
    })

    it("calls transport when Enter is pressed in input", async () => {
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={[]} />,
      )

      const input = screen.getByTestId("add-dependency")
      fireEvent.change(input, { target: { value: "UI-2" } })

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      expect(mockTransport).toHaveBeenCalledWith("dep-add", {
        a: "test-1",
        b: "UI-2",
        view_id: "test-1",
      })
    })

    it("clears input after successful add", async () => {
      renderWithContext(<DependencyList title="Dependencies" items={[]} />)

      const input = screen.getByTestId("add-dependency") as HTMLInputElement
      fireEvent.change(input, { target: { value: "UI-2" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(input.value).toBe("")
    })

    it("shows toast when input is empty", async () => {
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={[]} />,
      )

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith("Enter a different issue id")
    })

    it("shows toast when trying to add self as dependency", async () => {
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={[]} />,
        { issue: createMockIssue({ id: "UI-10" }) },
      )

      const input = screen.getByTestId("add-dependency")
      fireEvent.change(input, { target: { value: "UI-10" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith("Enter a different issue id")
    })

    it("shows toast when trying to add duplicate", async () => {
      const items: DependencyRef[] = [createMockDep({ id: "UI-9" })]
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={items} />,
      )

      const input = screen.getByTestId("add-dependency")
      fireEvent.change(input, { target: { value: "UI-9" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith("Link already exists")
    })

    it("trims whitespace from input before adding", async () => {
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={[]} />,
      )

      const input = screen.getByTestId("add-dependency")
      fireEvent.change(input, { target: { value: "  UI-2  " } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("dep-add", {
        a: "test-1",
        b: "UI-2",
        view_id: "test-1",
      })
    })

    it("disables input while pending", async () => {
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithContext(<DependencyList title="Dependencies" items={[]} />, {
        transport: mockTransport,
      })

      const input = screen.getByTestId("add-dependency") as HTMLInputElement
      fireEvent.change(input, { target: { value: "UI-2" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(input.disabled).toBe(true)
    })

    it("disables Add button while pending", async () => {
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithContext(<DependencyList title="Dependencies" items={[]} />, {
        transport: mockTransport,
      })

      const input = screen.getByTestId("add-dependency")
      fireEvent.change(input, { target: { value: "UI-2" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      const addButton = screen.getByRole("button", { name: "Add" }) as HTMLButtonElement
      expect(addButton.disabled).toBe(true)
    })

    it("handles transport error gracefully", async () => {
      const mockTransport = vi.fn().mockRejectedValue(new Error("Network error"))
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithContext(<DependencyList title="Dependencies" items={[]} />, {
        transport: mockTransport,
      })

      const input = screen.getByTestId("add-dependency")
      fireEvent.change(input, { target: { value: "UI-2" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      // Should not throw and input should be re-enabled
      await waitFor(() => {
        expect((screen.getByTestId("add-dependency") as HTMLInputElement).disabled).toBe(false)
      })
      expect(showToast).toHaveBeenCalledWith("Failed to add dependency", "error")

      consoleError.mockRestore()
    })
  })

  describe("removing dependencies", () => {
    it("calls transport with correct params for Dependencies", async () => {
      const items: DependencyRef[] = [createMockDep({ id: "UI-5" })]
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={items} />,
      )

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove dependency UI-5" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("dep-remove", {
        a: "test-1",
        b: "UI-5",
        view_id: "test-1",
      })
    })

    it("calls transport with correct params for Dependents", async () => {
      const items: DependencyRef[] = [createMockDep({ id: "UI-5" })]
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependents" items={items} />,
      )

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove dependency UI-5" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("dep-remove", {
        a: "UI-5",
        b: "test-1",
        view_id: "test-1",
      })
    })

    it("disables remove buttons while pending", async () => {
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      const items: DependencyRef[] = [
        createMockDep({ id: "dep-1" }),
        createMockDep({ id: "dep-2" }),
      ]
      renderWithContext(<DependencyList title="Dependencies" items={items} />, {
        transport: mockTransport,
      })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove dependency dep-1" }))
      })

      // All remove buttons should be disabled
      const removeButtons = screen.getAllByRole("button", { name: /Remove dependency/ })
      removeButtons.forEach(button => {
        expect((button as HTMLButtonElement).disabled).toBe(true)
      })
    })

    it("handles transport error gracefully", async () => {
      const mockTransport = vi.fn().mockRejectedValue(new Error("Network error"))
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
      const items: DependencyRef[] = [createMockDep({ id: "dep-1" })]

      renderWithContext(<DependencyList title="Dependencies" items={items} />, {
        transport: mockTransport,
      })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove dependency dep-1" }))
      })

      // Should not throw and buttons should be re-enabled
      await waitFor(() => {
        expect(
          (screen.getByRole("button", { name: "Remove dependency dep-1" }) as HTMLButtonElement)
            .disabled,
        ).toBe(false)
      })
      expect(showToast).toHaveBeenCalledWith("Failed to remove dependency", "error")

      consoleError.mockRestore()
    })
  })

  describe("navigation", () => {
    it("calls onNavigate when clicking on a dependency item", async () => {
      const items: DependencyRef[] = [createMockDep({ id: "UI-5", title: "Linked Issue" })]
      const { mockNavigate } = renderWithContext(
        <DependencyList title="Dependencies" items={items} />,
      )

      await act(async () => {
        fireEvent.click(screen.getByText("Linked Issue"))
      })

      // Should navigate to the issue
      expect(mockNavigate).toHaveBeenCalled()
      const href = mockNavigate.mock.calls[0]?.[0] as string
      expect(href).toContain("UI-5")
    })

    it("does not navigate when clicking remove button", async () => {
      const items: DependencyRef[] = [createMockDep({ id: "UI-5" })]
      const { mockNavigate, mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={items} />,
      )

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove dependency UI-5" }))
      })

      // Should not navigate (remove button stops propagation)
      expect(mockNavigate).not.toHaveBeenCalled()
      // But should call transport
      expect(mockTransport).toHaveBeenCalled()
    })

    it("sets data-href attribute on list items", () => {
      const items: DependencyRef[] = [createMockDep({ id: "UI-5" })]
      const { container } = renderWithContext(<DependencyList title="Dependencies" items={items} />)

      const li = container.querySelector("li")
      expect(li?.getAttribute("data-href")).toContain("UI-5")
    })
  })

  describe("edge cases", () => {
    it("handles null issue gracefully for add", async () => {
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={[]} />,
        { issue: null },
      )

      const input = screen.getByTestId("add-dependency")
      fireEvent.change(input, { target: { value: "UI-2" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("handles null issue gracefully for remove", async () => {
      const items: DependencyRef[] = [createMockDep({ id: "dep-1" })]
      const { mockTransport } = renderWithContext(
        <DependencyList title="Dependencies" items={items} />,
        { issue: null },
      )

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove dependency dep-1" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("renders container even when empty", () => {
      const { container } = renderWithContext(<DependencyList title="Dependencies" items={[]} />)

      expect(container.querySelector(".props-card")).toBeDefined()
    })
  })
})
