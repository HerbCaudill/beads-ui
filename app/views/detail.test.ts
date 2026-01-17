import { describe, expect, test } from "vitest"
import { createDetailView } from "./detail.js"
import type { IssueStores } from "../data/list-selectors.js"

describe("views/detail", () => {
  test("renders fields, markdown description, and dependency links", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue = {
      id: "UI-29",
      title: "Issue detail view",
      description:
        "# Heading\n\nImplement detail view with a [link](https://example.com) and `code`.",
      status: "open",
      priority: 2,
      dependencies: [{ id: "UI-25" }, { id: "UI-27" }],
      dependents: [{ id: "UI-34" }],
    }

    const navigations: string[] = []
    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-29" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const view = createDetailView(
      mount,
      async () => ({}),
      hash => {
        navigations.push(hash)
      },
      stores,
    )

    await view.load("UI-29")

    // ID is no longer rendered within detail view; the dialog title shows it
    const titleSpan = mount.querySelector("h2 .editable") as HTMLSpanElement
    expect(titleSpan.textContent).toBe("Issue detail view")
    // status select + priority select exist
    const selects = mount.querySelectorAll("select")
    expect(selects.length).toBeGreaterThanOrEqual(2)
    // description rendered as markdown in read mode
    const md = mount.querySelector(".md") as HTMLDivElement
    expect(md).toBeTruthy()
    const a = md.querySelector("a") as HTMLAnchorElement | null
    expect(a && a.getAttribute("href")).toBe("https://example.com")
    const code = md.querySelector("code")
    expect(code && code.textContent).toBe("code")

    const links = mount.querySelectorAll("li")
    const hrefs = Array.from(links)
      .map(a => a.dataset.href)
      .filter(Boolean)
    expect(hrefs).toEqual(["#/issues?issue=UI-25", "#/issues?issue=UI-27", "#/issues?issue=UI-34"])

    // No description textarea in read mode (only comment input textarea should exist)
    const descInput0 = mount.querySelector(".description textarea") as HTMLTextAreaElement | null
    expect(descInput0).toBeNull()

    // Simulate clicking the first internal link, ensure navigate_fn is used
    links[0]!.click()
    expect(navigations[navigations.length - 1]).toBe("#/issues?issue=UI-25")
  })

  test("renders type in Properties sidebar", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement
    const issue = {
      id: "UI-50",
      title: "With type",
      issue_type: "feature",
      dependencies: [],
      dependents: [],
    }
    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-50" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const view = createDetailView(mount, async () => ({}), undefined, stores)
    await view.load("UI-50")
    const badge = mount.querySelector(".props-card .type-badge")
    expect(badge).toBeTruthy()
    expect(badge && badge.textContent).toBe("Feature")
  })

  test("inline editing toggles for title and description", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue: Record<string, unknown> = {
      id: "UI-29",
      title: "Issue detail view",
      description: "Some text",
      status: "open",
      priority: 2,
      dependencies: [],
      dependents: [],
    }

    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-29" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }
    const view = createDetailView(
      mount,
      async (type, payload) => {
        if (type === "edit-text") {
          const f = (payload as { field: string }).field
          const v = (payload as { value: string }).value
          issue[f] = v
          return issue
        }
        throw new Error("Unexpected type")
      },
      undefined,
      stores as unknown as IssueStores,
    )

    await view.load("UI-29")

    // Title: click to edit -> input appears, Esc cancels
    const titleSpan = mount.querySelector("h2 .editable") as HTMLSpanElement
    titleSpan.click()
    let titleInput = mount.querySelector("h2 input") as HTMLInputElement
    expect(titleInput).toBeTruthy()
    const esc = new KeyboardEvent("keydown", { key: "Escape" })
    titleInput.dispatchEvent(esc)
    expect(mount.querySelector("h2 input") as HTMLInputElement | null).toBeNull()

    // Description: click to edit -> textarea appears, Ctrl+Enter saves
    const md = mount.querySelector(".md") as HTMLDivElement
    md.click()
    const area = mount.querySelector("textarea") as HTMLTextAreaElement
    area.value = "Changed"
    const key = new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true })
    area.dispatchEvent(key)
    // After save, returns to read mode (allow microtask flush)
    await Promise.resolve()
    // Only the comment input textarea should remain, no description textarea
    expect(mount.querySelector(".description textarea") as HTMLTextAreaElement | null).toBeNull()
  })

  test("shows placeholder when not found or bad payload", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement
    const stores = {
      snapshotFor() {
        return []
      },
      subscribe() {
        return () => {}
      },
    }
    const view = createDetailView(mount, async () => ({}), undefined, stores)

    await view.load("UI-404")
    expect((mount.textContent || "").toLowerCase()).toContain("loading")

    view.clear()
    expect((mount.textContent || "").toLowerCase()).toContain("select an issue")
  })

  test("renders comments section with author and timestamp", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue = {
      id: "UI-99",
      title: "Test issue",
      dependencies: [],
      dependents: [],
      comments: [
        {
          id: 1,
          author: "Alice",
          text: "This is a comment",
          created_at: "2025-01-15T10:30:00Z",
        },
        {
          id: 2,
          author: "Bob",
          text: "Another comment",
          created_at: "2025-01-15T11:00:00Z",
        },
      ],
    }

    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-99" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }

    const view = createDetailView(mount, async () => ({}), undefined, stores)
    await view.load("UI-99")

    // Check comments section exists
    const commentsSection = mount.querySelector(".comments")
    expect(commentsSection).toBeTruthy()

    // Check comments are rendered
    const commentItems = mount.querySelectorAll(".comment-item")
    expect(commentItems.length).toBe(2)

    // Check first comment content
    const firstComment = commentItems[0]
    expect(firstComment!.textContent).toContain("Alice")
    expect(firstComment!.textContent).toContain("This is a comment")
  })

  test("shows placeholder when no comments", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue = {
      id: "UI-100",
      title: "Test issue",
      dependencies: [],
      dependents: [],
      comments: [],
    }

    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-100" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }

    const view = createDetailView(mount, async () => ({}), undefined, stores)
    await view.load("UI-100")

    const commentsSection = mount.querySelector(".comments")
    expect(commentsSection).toBeTruthy()
    expect(commentsSection && commentsSection.textContent).toContain("No comments yet")
  })

  test("submits new comment via sendFn", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    const issue = {
      id: "UI-101",
      title: "Test issue",
      dependencies: [],
      dependents: [],
      comments: [],
    }

    const calls: Array<{ type: string; payload: unknown }> = []
    const sendFn = async (type: string, payload: unknown) => {
      calls.push({ type, payload })
      // Return updated comments
      return [
        {
          id: 1,
          author: "Me",
          text: "New comment",
          created_at: "2025-01-15T12:00:00Z",
        },
      ]
    }

    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-101" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }

    const view = createDetailView(mount, sendFn, undefined, stores)
    await view.load("UI-101")

    // Find textarea and button
    const textarea = mount.querySelector(".comment-input textarea") as HTMLTextAreaElement
    const button = mount.querySelector(".comment-input button") as HTMLButtonElement

    expect(textarea).toBeTruthy()
    expect(button).toBeTruthy()

    // Type a comment
    textarea.value = "Test comment"
    textarea.dispatchEvent(new Event("input", { bubbles: true }))

    // Click submit
    button.click()

    // Wait for async
    await new Promise(r => setTimeout(r, 10))

    // Verify sendFn was called correctly
    expect(calls.length).toBe(1)
    expect(calls[0]!.type).toBe("add-comment")
    expect(calls[0]!.payload).toEqual({ id: "UI-101", text: "Test comment" })
  })

  test("fetches comments on load when not in snapshot", async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
    const mount = document.getElementById("mount") as HTMLElement

    // Issue without comments in snapshot
    const issue = {
      id: "UI-102",
      title: "Test issue",
      dependencies: [],
      dependents: [],
      // No comments property
    }

    const calls: Array<{ type: string; payload: unknown }> = []
    const sendFn = async (type: string, payload: unknown) => {
      calls.push({ type, payload })
      if (type === "get-comments") {
        return [
          {
            id: 1,
            author: "Fetched",
            text: "Fetched comment",
            created_at: "2025-01-15T12:00:00Z",
          },
        ]
      }
      return {}
    }

    const stores = {
      snapshotFor(id: string) {
        return id === "detail:UI-102" ? [issue] : []
      },
      subscribe() {
        return () => {}
      },
    }

    const view = createDetailView(mount, sendFn, undefined, stores as unknown as IssueStores)
    await view.load("UI-102")

    // Wait for async fetch
    await new Promise(r => setTimeout(r, 50))

    // Verify get-comments was called
    const getCommentsCall = calls.find(c => c.type === "get-comments")
    expect(getCommentsCall).toBeTruthy()
    expect(getCommentsCall?.payload).toEqual({ id: "UI-102" })

    // Verify fetched comment is displayed
    const commentItems = mount.querySelectorAll(".comment-item")
    expect(commentItems.length).toBe(1)
    expect(commentItems[0]!.textContent).toContain("Fetched")
  })

  describe("delete issue", () => {
    test("renders delete button in detail view", async () => {
      document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
      const mount = document.getElementById("mount") as HTMLElement
      const issue = {
        id: "UI-99",
        title: "Test delete",
        dependencies: [],
        dependents: [],
      }
      const stores = {
        snapshotFor(id: string) {
          return id === "detail:UI-99" ? [issue] : []
        },
        subscribe() {
          return () => {}
        },
      }
      const view = createDetailView(mount, async () => ({}), undefined, stores)
      await view.load("UI-99")

      const deleteBtn = mount.querySelector(".delete-issue-btn")
      expect(deleteBtn).toBeTruthy()
      expect(deleteBtn?.getAttribute("title")).toBe("Delete issue")
    })

    test("clicking delete button opens confirmation dialog", async () => {
      document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
      const mount = document.getElementById("mount") as HTMLElement
      const issue = {
        id: "UI-100",
        title: "Confirm delete test",
        dependencies: [],
        dependents: [],
      }
      const stores = {
        snapshotFor(id: string) {
          return id === "detail:UI-100" ? [issue] : []
        },
        subscribe() {
          return () => {}
        },
      }
      const view = createDetailView(mount, async () => ({}), undefined, stores)
      await view.load("UI-100")

      const deleteBtn = mount.querySelector(".delete-issue-btn") as HTMLButtonElement
      deleteBtn.click()

      // Dialog should now be in document
      const dialog = document.getElementById("delete-confirm-dialog")
      expect(dialog).toBeTruthy()
      expect(dialog?.hasAttribute("open")).toBe(true)

      // Should show issue ID and title
      const message = dialog?.querySelector(".delete-confirm__message")
      expect(message?.innerHTML).toContain("<strong>UI-100</strong>")
      expect(message?.innerHTML).toContain("<strong>Confirm delete test</strong>")
    })

    test("cancel button closes dialog without deleting", async () => {
      document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
      const mount = document.getElementById("mount") as HTMLElement
      const issue = {
        id: "UI-101",
        title: "Cancel test",
        dependencies: [],
        dependents: [],
      }
      let deleteCalled = false
      const stores = {
        snapshotFor(id: string) {
          return id === "detail:UI-101" ? [issue] : []
        },
        subscribe() {
          return () => {}
        },
      }
      const view = createDetailView(
        mount,
        async type => {
          if (type === "delete-issue") deleteCalled = true
          return {}
        },
        undefined,
        stores,
      )
      await view.load("UI-101")

      const deleteBtn = mount.querySelector(".delete-issue-btn") as HTMLButtonElement
      deleteBtn.click()

      const dialog = document.getElementById("delete-confirm-dialog") as HTMLDialogElement
      const cancelBtn = dialog.querySelector(".btn:not(.danger)") as HTMLButtonElement
      cancelBtn.click()

      expect(dialog.hasAttribute("open")).toBe(false)
      expect(deleteCalled).toBe(false)
    })

    test("confirm button sends delete-issue and clears view", async () => {
      document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>'
      const mount = document.getElementById("mount") as HTMLElement
      const issue = {
        id: "UI-102",
        title: "Delete me",
        dependencies: [],
        dependents: [],
      }
      const calls: { type: string; payload: unknown }[] = []
      const stores = {
        snapshotFor(id: string) {
          return id === "detail:UI-102" ? [issue] : []
        },
        subscribe() {
          return () => {}
        },
      }
      const view = createDetailView(
        mount,
        async (type, payload) => {
          calls.push({ type, payload })
          return { deleted: true }
        },
        undefined,
        stores,
      )
      await view.load("UI-102")

      const deleteBtn = mount.querySelector(".delete-issue-btn") as HTMLButtonElement
      deleteBtn.click()

      const dialog = document.getElementById("delete-confirm-dialog") as HTMLDialogElement
      const confirmBtn = dialog.querySelector(".btn.danger") as HTMLButtonElement
      confirmBtn.click()

      // Wait for async operation
      await new Promise(r => setTimeout(r, 10))

      expect(calls).toContainEqual({
        type: "delete-issue",
        payload: { id: "UI-102" },
      })

      // View should be cleared (showing placeholder)
      const placeholder = mount.querySelector(".muted")
      expect(placeholder?.textContent).toContain("No issue selected")
    })
  })
})
