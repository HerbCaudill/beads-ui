/**
 * Tests for the DetailView React component.
 */
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DetailView, DetailContext, useDetailContext } from "./DetailView.js"
import { setIssueStoresInstance, clearIssueStoresInstance } from "../hooks/use-issue-stores.js"
import { setTransportInstance, clearTransportInstance } from "../hooks/use-transport.js"
import type { IssueDetail } from "../../types/issues.js"
import type { SubscriptionIssueStoresRegistry } from "../data/subscription-issue-stores.js"

/**
 * Create a mock issue for testing.
 */
function createMockIssue(overrides: Partial<IssueDetail> = {}): IssueDetail {
  return {
    id: "test-1",
    title: "Test Issue Title",
    description: "Test description content",
    design: "Test design content",
    notes: "Test notes content",
    acceptance: "Test acceptance criteria",
    status: "open",
    priority: 1,
    issue_type: "bug",
    assignee: "alice",
    labels: ["frontend", "urgent"],
    dependencies: [
      { id: "dep-1", title: "Dependency One", status: "open" },
      { id: "dep-2", title: "Dependency Two", status: "closed" },
    ],
    dependents: [{ id: "dpt-1", title: "Dependent One", status: "in_progress" }],
    comments: [
      { id: 1, author: "bob", text: "First comment", created_at: "2024-01-15T10:00:00Z" },
      { id: 2, author: "alice", text: "Second comment", created_at: "2024-01-15T11:00:00Z" },
    ],
    ...overrides,
  }
}

/**
 * Create a mock issue stores registry.
 */
function createMockRegistry(issues: IssueDetail[] = []): SubscriptionIssueStoresRegistry {
  const subscribers: Set<() => void> = new Set()

  return {
    register: () => () => {},
    unregister: () => {},
    getStore: (client_id: string) => {
      // Only return store for matching client_id pattern
      if (client_id.startsWith("detail:")) {
        return {
          snapshot: () => issues,
          getById: (id: string) => issues.find(i => i.id === id),
          upsert: () => {},
          remove: () => {},
          clear: () => {},
          subscribe: () => () => {},
          dispose: () => {},
        }
      }
      return null
    },
    snapshotFor: (client_id: string) => {
      if (client_id.startsWith("detail:")) {
        return issues
      }
      return []
    },
    subscribe: (cb: () => void) => {
      subscribers.add(cb)
      return () => {
        subscribers.delete(cb)
      }
    },
  } as SubscriptionIssueStoresRegistry
}

describe("DetailView", () => {
  const mockNavigate = vi.fn()
  const mockTransport = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    setTransportInstance(mockTransport)
  })

  afterEach(() => {
    vi.clearAllMocks()
    clearIssueStoresInstance()
    clearTransportInstance()
  })

  describe("rendering", () => {
    it("renders loading state when issue is not available", () => {
      // Set up empty registry
      setIssueStoresInstance(createMockRegistry([]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} testId="detail-view" />)

      expect(screen.getByText("Loading...")).toBeDefined()
    })

    it("renders issue title in header", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} testId="detail-view" />)

      expect(screen.getByText("Test Issue Title")).toBeDefined()
    })

    it("renders all sections", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} testId="detail-view" />)

      // Check for section test IDs (DetailHeader, DetailProperties, and EditableMarkdownFields are now real components)
      expect(screen.getByTestId("detail-header")).toBeDefined()
      expect(screen.getByTestId("detail-properties")).toBeDefined()
      // EditableMarkdownField components
      expect(screen.getByTestId("detail-description")).toBeDefined()
      expect(screen.getByTestId("detail-design")).toBeDefined()
      expect(screen.getByTestId("detail-notes")).toBeDefined()
      expect(screen.getByTestId("detail-acceptance")).toBeDefined()
      // LabelsSection is now a real component
      expect(screen.getByTestId("detail-labels")).toBeDefined()
      // DependencyList is now a real component
      expect(screen.getByTestId("detail-dependencies")).toBeDefined()
      expect(screen.getByTestId("detail-dependents")).toBeDefined()
      // CommentSection is now a real component
      expect(screen.getByTestId("detail-comments")).toBeDefined()
    })

    it("renders properties section with correct values", () => {
      const issue = createMockIssue({ assignee: "charlie" }) // Use unique name to avoid collision with comment author
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      // Type badge renders capitalized
      expect(screen.getByText("Bug")).toBeDefined()
      // Status is rendered via select with label
      expect(screen.getByDisplayValue("Open")).toBeDefined()
      // Priority is rendered via select (no "P1" format anymore)
      const prioritySelect = document.querySelector("select.badge--priority") as HTMLSelectElement
      expect(prioritySelect).toBeDefined()
      expect(prioritySelect.value).toBe("1")
      // Assignee is shown
      expect(screen.getByText("charlie")).toBeDefined()
    })

    it("renders description content", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("Test description content")).toBeDefined()
    })

    it("renders labels", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("frontend")).toBeDefined()
      expect(screen.getByText("urgent")).toBeDefined()
    })

    it("renders dependencies", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("Dependency One")).toBeDefined()
      expect(screen.getByText("Dependency Two")).toBeDefined()
    })

    it("renders dependents", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("Dependent One")).toBeDefined()
    })

    it("renders comments", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("First comment")).toBeDefined()
      expect(screen.getByText("Second comment")).toBeDefined()
      expect(screen.getByText("bob")).toBeDefined()
    })

    it("renders no comments message when empty", () => {
      const issue = createMockIssue({ comments: [] })
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("No comments yet")).toBeDefined()
    })

    it("renders placeholder text for empty fields", () => {
      const issue = createMockIssue({
        description: "",
        design: "",
        notes: "",
        acceptance: "",
      })
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("Description")).toBeDefined()
      expect(screen.getByText("Add design...")).toBeDefined()
      expect(screen.getByText("Add notes...")).toBeDefined()
      expect(screen.getByText("Add acceptance criteria...")).toBeDefined()
    })

    it("renders with testId when provided", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} testId="my-detail-view" />)

      expect(screen.getByTestId("my-detail-view")).toBeDefined()
    })
  })

  describe("context", () => {
    it("provides DetailContext to children (verified via rendered content)", () => {
      // The DetailContext is used internally by child components
      // We verify the context is set up correctly by checking that the issue renders
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      // If the context is set up correctly, the issue data will be rendered
      expect(screen.getByText("Test Issue Title")).toBeDefined()
    })

    it("throws error when useDetailContext is used outside DetailView", () => {
      function BadComponent(): React.JSX.Element {
        useDetailContext()
        return <div>Should not render</div>
      }

      // Suppress React error boundary console output for this test
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      expect(() => render(<BadComponent />)).toThrow(
        "useDetailContext must be used within a DetailView component",
      )

      consoleError.mockRestore()
    })
  })

  describe("empty states", () => {
    it("renders Unassigned when no assignee", () => {
      const issue = createMockIssue({ assignee: null })
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("Unassigned")).toBeDefined()
    })

    it("renders (no title) when title is empty", () => {
      const issue = createMockIssue({ title: "" })
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      expect(screen.getByText("(no title)")).toBeDefined()
    })

    it("renders empty labels section", () => {
      const issue = createMockIssue({ labels: [] })
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      // Labels section should exist but be empty
      expect(screen.getByTestId("detail-labels")).toBeDefined()
    })

    it("renders empty dependencies section", () => {
      const issue = createMockIssue({ dependencies: [] })
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} />)

      // Dependencies section should exist but be empty
      expect(screen.getByTestId("detail-dependencies")).toBeDefined()
    })
  })

  describe("layout", () => {
    it("has correct layout structure", () => {
      const issue = createMockIssue()
      setIssueStoresInstance(createMockRegistry([issue]))

      render(<DetailView issueId="test-1" onNavigate={mockNavigate} testId="detail-view" />)

      const root = screen.getByTestId("detail-view")
      expect(root.querySelector(".detail-layout")).toBeDefined()
      expect(root.querySelector(".detail-main")).toBeDefined()
      expect(root.querySelector(".detail-side")).toBeDefined()
    })
  })
})
