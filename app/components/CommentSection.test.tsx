/**
 * Tests for the CommentSection React component.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CommentSection } from "./CommentSection.js"
import { DetailContext, type DetailContextValue } from "./DetailView.js"
import type { IssueDetail, Comment } from "../../types/issues.js"

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
 * Create a mock comment for testing.
 */
function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 1,
    author: "alice",
    text: "Test comment",
    created_at: "2024-01-15T10:30:00Z",
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

describe("CommentSection", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders with testId when provided", () => {
      renderWithContext(<CommentSection comments={[]} testId="comment-section" />)

      expect(screen.getByTestId("comment-section")).toBeDefined()
    })

    it("renders Comments title", () => {
      renderWithContext(<CommentSection comments={[]} />)

      expect(screen.getByText("Comments")).toBeDefined()
    })

    it("renders 'No comments yet' when empty", () => {
      renderWithContext(<CommentSection comments={[]} />)

      expect(screen.getByText("No comments yet")).toBeDefined()
    })

    it("renders all provided comments", () => {
      const comments = [
        createMockComment({ id: 1, text: "First comment" }),
        createMockComment({ id: 2, text: "Second comment" }),
        createMockComment({ id: 3, text: "Third comment" }),
      ]
      renderWithContext(<CommentSection comments={comments} />)

      expect(screen.getByText("First comment")).toBeDefined()
      expect(screen.getByText("Second comment")).toBeDefined()
      expect(screen.getByText("Third comment")).toBeDefined()
    })

    it("renders comment author", () => {
      const comments = [createMockComment({ author: "bob" })]
      renderWithContext(<CommentSection comments={comments} />)

      expect(screen.getByText("bob")).toBeDefined()
    })

    it("renders 'Unknown' when author is missing", () => {
      // Create a comment without the author property
      const comment: Comment = { id: 1, text: "Test comment" }
      renderWithContext(<CommentSection comments={[comment]} />)

      expect(screen.getByText("Unknown")).toBeDefined()
    })

    it("renders formatted comment date", () => {
      const comments = [createMockComment({ created_at: "2024-01-15T10:30:00Z" })]
      renderWithContext(<CommentSection comments={comments} />)

      // The exact format depends on locale, but it should contain the date parts
      const dateSpan = screen.getByText(/Jan.*15.*2024/)
      expect(dateSpan).toBeDefined()
    })

    it("renders empty string when date is missing", () => {
      // Create a comment without the created_at property
      const comment: Comment = { id: 1, text: "Test comment", author: "alice" }
      renderWithContext(<CommentSection comments={[comment]} />)

      // The date element should exist but be empty
      const commentItem = screen.getByText("Test comment").closest(".comment-item")
      const dateElement = commentItem?.querySelector(".comment-date")
      expect(dateElement?.textContent).toBe("")
    })

    it("renders textarea for adding comments", () => {
      renderWithContext(<CommentSection comments={[]} />)

      expect(screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")).toBeDefined()
    })

    it("renders Add Comment button", () => {
      renderWithContext(<CommentSection comments={[]} />)

      expect(screen.getByRole("button", { name: "Add Comment" })).toBeDefined()
    })
  })

  describe("adding comments", () => {
    it("calls transport when Add Comment button is clicked", async () => {
      const { mockTransport } = renderWithContext(<CommentSection comments={[]} />)

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "New comment text" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("add-comment", {
        id: "test-1",
        text: "New comment text",
      })
    })

    it("calls transport when Ctrl+Enter is pressed", async () => {
      const { mockTransport } = renderWithContext(<CommentSection comments={[]} />)

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "New comment text" } })

      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
      })

      expect(mockTransport).toHaveBeenCalledWith("add-comment", {
        id: "test-1",
        text: "New comment text",
      })
    })

    it("calls transport when Cmd+Enter is pressed (Mac)", async () => {
      const { mockTransport } = renderWithContext(<CommentSection comments={[]} />)

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "New comment text" } })

      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", metaKey: true })
      })

      expect(mockTransport).toHaveBeenCalledWith("add-comment", {
        id: "test-1",
        text: "New comment text",
      })
    })

    it("does not submit on Enter without modifier keys", async () => {
      const { mockTransport } = renderWithContext(<CommentSection comments={[]} />)

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "New comment text" } })

      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter" })
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("clears textarea after successful submit", async () => {
      renderWithContext(<CommentSection comments={[]} />)

      const textarea = screen.getByPlaceholderText(
        "Add a comment... (Ctrl+Enter to submit)",
      ) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: "New comment text" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      expect(textarea.value).toBe("")
    })

    it("does not call transport when textarea is empty", async () => {
      const { mockTransport } = renderWithContext(<CommentSection comments={[]} />)

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("does not call transport when textarea is only whitespace", async () => {
      const { mockTransport } = renderWithContext(<CommentSection comments={[]} />)

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "   " } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("trims whitespace from comment text before submitting", async () => {
      const { mockTransport } = renderWithContext(<CommentSection comments={[]} />)

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "  New comment text  " } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("add-comment", {
        id: "test-1",
        text: "New comment text",
      })
    })

    it("disables textarea while pending", async () => {
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithContext(<CommentSection comments={[]} />, { transport: mockTransport })

      const textarea = screen.getByPlaceholderText(
        "Add a comment... (Ctrl+Enter to submit)",
      ) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: "New comment text" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      expect(textarea.disabled).toBe(true)
    })

    it("shows 'Adding...' on button while pending", async () => {
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithContext(<CommentSection comments={[]} />, { transport: mockTransport })

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "New comment text" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      expect(screen.getByRole("button", { name: "Adding..." })).toBeDefined()
    })

    it("disables button when textarea is empty", () => {
      renderWithContext(<CommentSection comments={[]} />)

      const button = screen.getByRole("button", { name: "Add Comment" }) as HTMLButtonElement
      expect(button.disabled).toBe(true)
    })

    it("enables button when textarea has content", () => {
      renderWithContext(<CommentSection comments={[]} />)

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "Some text" } })

      const button = screen.getByRole("button", { name: "Add Comment" }) as HTMLButtonElement
      expect(button.disabled).toBe(false)
    })

    it("handles transport error gracefully", async () => {
      const mockTransport = vi.fn().mockRejectedValue(new Error("Network error"))
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithContext(<CommentSection comments={[]} />, { transport: mockTransport })

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "New comment text" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      // Should not throw and textarea should be re-enabled
      await waitFor(() => {
        expect(
          (
            screen.getByPlaceholderText(
              "Add a comment... (Ctrl+Enter to submit)",
            ) as HTMLTextAreaElement
          ).disabled,
        ).toBe(false)
      })

      consoleError.mockRestore()
    })
  })

  describe("edge cases", () => {
    it("handles null issue gracefully", async () => {
      const { mockTransport } = renderWithContext(<CommentSection comments={[]} />, {
        issue: null,
      })

      const textarea = screen.getByPlaceholderText("Add a comment... (Ctrl+Enter to submit)")
      fireEvent.change(textarea, { target: { value: "New comment" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Add Comment" }))
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("renders comments container even when empty", () => {
      const { container } = renderWithContext(<CommentSection comments={[]} />)

      expect(container.querySelector(".comments")).toBeDefined()
    })

    it("handles invalid date string gracefully", () => {
      const comments = [createMockComment({ created_at: "invalid-date" })]
      renderWithContext(<CommentSection comments={comments} />)

      // Should render the original string when date parsing fails
      const commentItem = screen.getByText("Test comment").closest(".comment-item")
      const dateElement = commentItem?.querySelector(".comment-date")
      expect(dateElement?.textContent).toBe("invalid-date")
    })
  })
})
