// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { IssueListView } from "../IssueListView.js"
import type { IssueListResult } from "../types.js"

describe("IssueListView", () => {
  afterEach(cleanup)

  test("groups issues into a compact repository summary", () => {
    render(<IssueListView result={result} />)

    expect(screen.getByText("3 active issues")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "In progress section, 1 task" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ready section, 1 task" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Blocked section, 1 task" })).toBeInTheDocument()
    expect(screen.getByText("Add MCP support")).toBeInTheDocument()
  })

  test("refreshes the displayed issues on request", () => {
    const onRefresh = vi.fn(() => Promise.resolve())
    render(<IssueListView onRefresh={onRefresh} result={result} />)

    fireEvent.click(screen.getByRole("button", { name: "Refresh issues" }))

    expect(onRefresh).toHaveBeenCalledOnce()
  })

  test("collapses and expands a status group", () => {
    render(<IssueListView result={result} />)

    fireEvent.click(screen.getByRole("button", { name: "In progress section, 1 task" }))
    expect(screen.queryByText("Add MCP support")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "In progress section, 1 task" }))
    expect(screen.getByText("Add MCP support")).toBeInTheDocument()
  })

  test("filters issues by ID, title, description, and label", () => {
    render(<IssueListView result={result} />)

    fireEvent.change(screen.getByRole("searchbox", { name: "Filter issues" }), {
      target: { value: "documentation" },
    })

    expect(screen.getByText("Write setup guide")).toBeInTheDocument()
    expect(screen.queryByText("Add MCP support")).not.toBeInTheDocument()
    expect(screen.getByText("1 matching issue")).toBeInTheDocument()
  })

  test("shows a clear empty state", () => {
    render(
      <IssueListView
        result={{
          includeClosed: false,
          issues: [],
          workspace: "/work/beads-ui",
        }}
      />,
    )

    expect(screen.getByText("No active issues")).toBeInTheDocument()
  })

  test("labels results that include closed issues accurately", () => {
    render(
      <IssueListView
        result={{
          ...result,
          includeClosed: true,
          issues: [
            ...result.issues,
            {
              closedAt: "2026-08-03T10:00:00.000Z",
              commentCount: 0,
              createdAt: "2026-08-03T08:00:00.000Z",
              dependencyCount: 0,
              dependentCount: 0,
              id: "bd-100",
              labels: [],
              priority: 2,
              status: "closed",
              title: "Research MCP Apps",
              type: "task",
              updatedAt: "2026-08-03T10:00:00.000Z",
            },
          ],
        }}
      />,
    )

    expect(screen.getByText("4 issues")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Closed section, 1 task" })).toBeInTheDocument()
    expect(screen.queryByText("4 active issues")).not.toBeInTheDocument()
  })
})

const result = {
  includeClosed: false,
  issues: [
    {
      commentCount: 2,
      createdAt: "2026-08-03T08:00:00.000Z",
      dependencyCount: 0,
      dependentCount: 1,
      description: "Expose task data to agents.",
      id: "bd-123",
      labels: ["mcp"],
      priority: 1,
      status: "in_progress",
      title: "Add MCP support",
      type: "feature",
      updatedAt: "2026-08-03T09:00:00.000Z",
    },
    {
      commentCount: 0,
      createdAt: "2026-08-03T08:00:00.000Z",
      dependencyCount: 0,
      dependentCount: 0,
      description: "Document installation and configuration.",
      id: "bd-124",
      labels: ["documentation"],
      priority: 2,
      status: "open",
      title: "Write setup guide",
      type: "task",
      updatedAt: "2026-08-03T09:00:00.000Z",
    },
    {
      commentCount: 0,
      createdAt: "2026-08-03T08:00:00.000Z",
      dependencyCount: 1,
      dependentCount: 0,
      id: "bd-125",
      labels: [],
      priority: 0,
      status: "blocked",
      title: "Publish package",
      type: "task",
      updatedAt: "2026-08-03T09:00:00.000Z",
    },
  ],
  workspace: "/work/beads-ui",
} satisfies IssueListResult
