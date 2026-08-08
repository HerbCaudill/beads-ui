// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { IssueListRefreshButton } from "../IssueListRefreshButton.js"

describe("IssueListRefreshButton", () => {
  afterEach(cleanup)

  test("shows a visible error and allows retrying a failed refresh", async () => {
    const onRefresh = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Beads could not refresh the issue list."))
      .mockResolvedValueOnce()
    render(<IssueListRefreshButton onRefresh={onRefresh} />)

    fireEvent.click(screen.getByRole("button", { name: "Refresh issues" }))

    expect(await screen.findByText("Couldn’t refresh issues.")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: /Refresh issues/ }))

    expect(onRefresh).toHaveBeenCalledTimes(2)
  })
})
