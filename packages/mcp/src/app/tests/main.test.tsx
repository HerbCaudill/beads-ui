// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { fireEvent, screen } from "@testing-library/react"
import { expect, test } from "vitest"

test("renders an interactive MCP widget preview in development", async () => {
  document.body.innerHTML = '<div id="root"></div>'

  await import("../main.js")

  expect(await screen.findByRole("heading", { name: "MCP widget preview" })).toBeInTheDocument()
  expect(screen.getByText("5 active issues")).toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: "Dark theme" }))
  expect(screen.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true")
  expect(screen.getByRole("region", { name: /Widget preview/ })).toHaveAttribute(
    "data-theme",
    "dark",
  )

  fireEvent.click(screen.getByRole("button", { name: "Narrow width" }))
  expect(
    screen.getByRole("region", { name: "Widget preview, 360 pixels wide" }),
  ).toBeInTheDocument()

  fireEvent.change(screen.getByRole("combobox", { name: "Issue set" }), {
    target: { value: "all" },
  })
  expect(screen.getByText("6 issues")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Closed section, 1 task" })).toBeInTheDocument()

  expect(screen.getByRole("option", { name: "Single issue" })).toBeInTheDocument()
  fireEvent.change(screen.getByRole("combobox", { name: "Issue set" }), {
    target: { value: "single" },
  })
  expect(screen.getByRole("heading", { name: "Display a single bead inline" })).toBeInTheDocument()
  expect(screen.getByText("Give one issue enough room for its full context.")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Dependencies 1" })).toBeInTheDocument()
  expect(screen.getByText("blocks this issue")).toBeInTheDocument()
  expect(screen.getByText("blocked by this issue")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Comments 1" })).toBeInTheDocument()
  expect(screen.getByText("Lynne")).toBeInTheDocument()

  fireEvent.change(screen.getByRole("combobox", { name: "Issue set" }), {
    target: { value: "empty" },
  })
  expect(screen.getByText("No active issues")).toBeInTheDocument()
})
