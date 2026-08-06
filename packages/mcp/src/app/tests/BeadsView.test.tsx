// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { BeadsView } from "../BeadsView.js"
import type { IssueListResult, IssueResult } from "../types.js"

describe("BeadsView drill-down", () => {
  afterEach(cleanup)

  test("opens an issue's detail in place of the list", async () => {
    render(<BeadsView loadIssue={() => Promise.resolve(detailResult)} result={listResult} />)

    fireEvent.click(screen.getByRole("button", { name: "Add MCP support" }))

    expect(await screen.findByRole("heading", { name: "Add MCP support" })).toBeInTheDocument()
    expect(screen.getByText("Expose task data to agents.")).toBeInTheDocument()
  })

  test("returns to the list with its filter intact", async () => {
    render(<BeadsView loadIssue={() => Promise.resolve(detailResult)} result={listResult} />)

    fireEvent.change(screen.getByRole("searchbox", { name: "Filter issues" }), {
      target: { value: "mcp" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add MCP support" }))
    expect(await screen.findByRole("heading", { name: "Add MCP support" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "All issues" }))

    expect(screen.getByRole("searchbox", { name: "Filter issues" })).toHaveValue("mcp")
    expect(screen.getByText("1 matching issue")).toBeInTheDocument()
  })

  test("reports a failed load without losing the list", async () => {
    render(
      <BeadsView
        loadIssue={() => Promise.reject(new Error("Beads could not load bd-123."))}
        result={listResult}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Add MCP support" }))

    expect(await screen.findByText("Beads could not load bd-123.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "All issues" }))
    expect(screen.getByText("Add MCP support")).toBeInTheDocument()
  })

  test("ignores a load that resolves after the user goes back", async () => {
    let resolveLoad: (result: IssueResult) => void = () => undefined
    const loadIssue = vi.fn(
      () =>
        new Promise<IssueResult>((resolve) => {
          resolveLoad = resolve
        }),
    )
    render(<BeadsView loadIssue={loadIssue} result={listResult} />)

    fireEvent.click(screen.getByRole("button", { name: "Add MCP support" }))
    expect(await screen.findByText("Loading bd-123…")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "All issues" }))
    resolveLoad(detailResult)

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "All issues" })).not.toBeInTheDocument(),
    )
    expect(screen.queryByRole("heading", { name: "Add MCP support" })).not.toBeInTheDocument()
  })

  test("renders a single-issue result without drill-down chrome", () => {
    render(<BeadsView loadIssue={() => Promise.resolve(detailResult)} result={detailResult} />)

    expect(screen.getByRole("heading", { name: "Add MCP support" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "All issues" })).not.toBeInTheDocument()
  })
})

const issue = {
  commentCount: 0,
  createdAt: "2026-08-03T08:00:00.000Z",
  dependencyCount: 0,
  dependentCount: 0,
  description: "Expose task data to agents.",
  id: "bd-123",
  labels: ["mcp"],
  priority: 1,
  status: "in_progress",
  title: "Add MCP support",
  type: "feature",
  updatedAt: "2026-08-03T09:00:00.000Z",
} as const

const listResult = {
  includeClosed: false,
  issues: [issue],
  workspace: "/work/beads-ui",
} satisfies IssueListResult

const detailResult = { issue, workspace: "/work/beads-ui" } satisfies IssueResult
