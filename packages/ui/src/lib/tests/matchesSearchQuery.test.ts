import { describe, it, expect } from "vitest"
import { matchesSearchQuery } from ".././matchesSearchQuery"
import type { TaskCardTask } from "../../types"

const task = (overrides: Partial<TaskCardTask> = {}): TaskCardTask => ({
  id: "task-1",
  title: "Fix authentication bug",
  status: "open",
  ...overrides,
})

describe("matchesSearchQuery", () => {
  describe("basic matching", () => {
    it("returns true when query is empty", () => {
      expect(matchesSearchQuery(task(), "")).toBe(true)
    })

    it("returns true when query is whitespace", () => {
      expect(matchesSearchQuery(task(), "   ")).toBe(true)
    })

    it("matches title substring", () => {
      expect(matchesSearchQuery(task(), "auth")).toBe(true)
    })

    it("matches task id", () => {
      expect(matchesSearchQuery(task({ id: "rui-abc123" }), "abc123")).toBe(true)
    })

    it("matches description", () => {
      expect(matchesSearchQuery(task({ description: "This involves React hooks" }), "React")).toBe(
        true,
      )
    })

    it("is case insensitive", () => {
      expect(matchesSearchQuery(task({ title: "FIX AUTHENTICATION" }), "fix")).toBe(true)
      expect(matchesSearchQuery(task({ title: "fix auth" }), "FIX")).toBe(true)
    })

    it("returns false when no field matches", () => {
      expect(matchesSearchQuery(task(), "zebra")).toBe(false)
    })
  })

  describe("multi-word matching", () => {
    it("matches when all words are present in the title", () => {
      expect(
        matchesSearchQuery(task({ title: "Fix authentication bug in login" }), "fix bug"),
      ).toBe(true)
    })

    it("matches words in any order", () => {
      expect(matchesSearchQuery(task({ title: "Fix authentication bug" }), "bug fix")).toBe(true)
    })

    it("matches words across different fields", () => {
      expect(
        matchesSearchQuery(
          task({ title: "Fix login", description: "Authentication is broken" }),
          "login authentication",
        ),
      ).toBe(true)
    })

    it("matches words across id and title", () => {
      expect(matchesSearchQuery(task({ id: "rui-abc", title: "Fix something" }), "abc fix")).toBe(
        true,
      )
    })

    it("returns false when only some words match", () => {
      expect(matchesSearchQuery(task({ title: "Fix authentication bug" }), "fix zebra")).toBe(false)
    })

    it("handles multiple spaces between words", () => {
      expect(matchesSearchQuery(task({ title: "Fix authentication bug" }), "fix   bug")).toBe(true)
    })

    it("handles leading and trailing spaces", () => {
      expect(matchesSearchQuery(task({ title: "Fix authentication bug" }), "  fix bug  ")).toBe(
        true,
      )
    })

    it("matches three or more words", () => {
      expect(
        matchesSearchQuery(
          task({ title: "Fix critical authentication bug in production" }),
          "fix bug production",
        ),
      ).toBe(true)
    })

    it("each word is matched as substring", () => {
      expect(matchesSearchQuery(task({ title: "Fix authentication bug" }), "auth bug")).toBe(true)
    })

    it("matches a quoted phrase within one field", () => {
      expect(
        matchesSearchQuery(task({ title: "Fix authentication bug" }), '"authentication bug"'),
      ).toBe(true)
      expect(
        matchesSearchQuery(
          task({ title: "Fix authentication", description: "Bug in production" }),
          '"authentication bug"',
        ),
      ).toBe(false)
    })
  })

  describe("structured filters", () => {
    it("filters by status and accepts natural in-progress aliases", () => {
      const inProgressTask = task({ status: "in_progress" })

      expect(matchesSearchQuery(inProgressTask, "status:in_progress")).toBe(true)
      expect(matchesSearchQuery(inProgressTask, "status:in-progress")).toBe(true)
      expect(matchesSearchQuery(inProgressTask, 'status:"in progress"')).toBe(true)
      expect(matchesSearchQuery(inProgressTask, "status:open")).toBe(false)
    })

    it("ORs comma-separated values", () => {
      expect(matchesSearchQuery(task({ status: "open" }), "status:open,blocked")).toBe(true)
      expect(matchesSearchQuery(task({ status: "closed" }), "status:open,blocked")).toBe(false)
    })

    it("ANDs separate filters and text terms", () => {
      const matchingTask = task({
        labels: ["frontend"],
        priority: 1,
        title: "Fix authentication",
      })

      expect(matchesSearchQuery(matchingTask, "label:frontend priority:P1 authentication")).toBe(
        true,
      )
      expect(matchesSearchQuery(matchingTask, "label:frontend priority:P2 authentication")).toBe(
        false,
      )
    })

    it("negates filters and text terms with a leading minus", () => {
      const matchingTask = task({ labels: ["frontend"], title: "Modern login" })

      expect(matchesSearchQuery(matchingTask, "-status:closed -label:wontfix -deprecated")).toBe(
        true,
      )
      expect(matchesSearchQuery(matchingTask, "-label:frontend")).toBe(false)
      expect(matchesSearchQuery(matchingTask, "-modern")).toBe(false)
    })

    it("matches labels exactly without regard to case", () => {
      const labeledTask = task({ labels: ["Frontend", "needs review"] })

      expect(matchesSearchQuery(labeledTask, "label:frontend")).toBe(true)
      expect(matchesSearchQuery(labeledTask, "label:front")).toBe(false)
      expect(matchesSearchQuery(labeledTask, 'label:"Needs Review"')).toBe(true)
    })

    it("requires every separately specified label", () => {
      const labeledTask = task({ labels: ["frontend", "urgent"] })

      expect(matchesSearchQuery(labeledTask, "label:frontend label:urgent")).toBe(true)
      expect(matchesSearchQuery(labeledTask, "label:frontend label:backend")).toBe(false)
    })

    it("supports exact, alternative, and compared priorities", () => {
      const highPriorityTask = task({ priority: 1 })

      expect(matchesSearchQuery(highPriorityTask, "priority:P1")).toBe(true)
      expect(matchesSearchQuery(highPriorityTask, "priority:1")).toBe(true)
      expect(matchesSearchQuery(highPriorityTask, "priority:P0,P1")).toBe(true)
      expect(matchesSearchQuery(highPriorityTask, "priority:<=P1")).toBe(true)
      expect(matchesSearchQuery(highPriorityTask, "priority:>=P3")).toBe(false)
    })

    it("filters by canonical types and Beads aliases", () => {
      expect(matchesSearchQuery(task({ issue_type: "feature" }), "type:feat")).toBe(true)
      expect(matchesSearchQuery(task({ issue_type: "merge-request" }), "type:mr")).toBe(true)
      expect(matchesSearchQuery(task({ issue_type: "task" }), "type:bug")).toBe(false)
    })

    it("matches direct parents with or without the workspace prefix", () => {
      const childTask = task({ id: "bd-child", parent: "bd-123" })

      expect(matchesSearchQuery(childTask, "parent:bd-123", "bd")).toBe(true)
      expect(matchesSearchQuery(childTask, "parent:123", "bd")).toBe(true)
      expect(matchesSearchQuery(childTask, "parent:12", "bd")).toBe(false)
      expect(
        matchesSearchQuery(task({ parent: "bd-release-123" }), "parent:release-123", "bd"),
      ).toBe(true)
      expect(matchesSearchQuery(task({ parent: "bd-nested-123" }), "parent:123", "bd")).toBe(false)
      expect(
        matchesSearchQuery(task({ id: "bd-child", parent: "other-123" }), "parent:123", "bd"),
      ).toBe(false)
    })

    it("uses the configured prefix instead of inferring it from task IDs", () => {
      const forcedIdTask = task({ id: "custom-child", parent: "foo-bar-123" })

      expect(matchesSearchQuery(forcedIdTask, "parent:123", "foo-bar")).toBe(true)
      expect(matchesSearchQuery(forcedIdTask, "parent:bar-123", "foo-bar")).toBe(false)
    })

    it("filters by readiness", () => {
      const readyTask = task({ is_ready: true } as Partial<TaskCardTask> & {
        is_ready: boolean
      })

      expect(matchesSearchQuery(readyTask, "is:ready")).toBe(true)
      expect(matchesSearchQuery(readyTask, "-is:ready")).toBe(false)
      expect(matchesSearchQuery(task({ status: "open" }), "is:ready")).toBe(false)
    })

    it("filters root and child tasks", () => {
      expect(matchesSearchQuery(task(), "is:root")).toBe(true)
      expect(matchesSearchQuery(task({ parent: "bd-123" }), "is:root")).toBe(false)
      expect(matchesSearchQuery(task({ parent: "bd-123" }), "-is:root")).toBe(true)
    })

    it("does not match structured fields through unqualified text", () => {
      expect(matchesSearchQuery(task({ issue_type: "bug", title: "Broken login" }), "bug")).toBe(
        false,
      )
    })
  })

  describe("edge cases", () => {
    it("handles task with no description", () => {
      expect(matchesSearchQuery(task({ description: undefined }), "test")).toBe(false)
    })

    it("handles single character query", () => {
      expect(matchesSearchQuery(task({ title: "Fix bug" }), "F")).toBe(true)
    })

    it("treats single word the same as before", () => {
      expect(matchesSearchQuery(task({ title: "authentication" }), "auth")).toBe(true)
    })
  })
})
