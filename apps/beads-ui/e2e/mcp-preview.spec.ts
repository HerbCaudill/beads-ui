import { expect, test } from "@playwright/test"

test("previews the production widget at a narrow host width", async ({ page }) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })

  await page.goto("http://127.0.0.1:4175/")
  await expect(page.getByRole("heading", { name: "MCP widget preview" })).toBeVisible()

  await page.getByRole("button", { name: "Narrow width" }).click()

  await expect(page.getByText("5 active issues")).toBeVisible()

  const widget = page.getByRole("region", { name: "Widget preview, 360 pixels wide" })
  await expect
    .poll(() => widget.evaluate((element) => element.scrollWidth <= element.clientWidth))
    .toBe(true)
  expect(consoleErrors).toEqual([])
})

test("drills from the issue list into one issue and back", async ({ page }) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })

  await page.goto("http://127.0.0.1:4175/")
  await page.getByRole("searchbox", { name: "Filter issues" }).fill("espresso")
  await expect(page.getByText("1 matching issue")).toBeVisible()

  await page.getByRole("button", { name: "Teach the task list to make espresso" }).click()

  await expect(
    page.getByRole("heading", { name: "Teach the task list to make espresso" }),
  ).toBeVisible()
  await expect(page.getByRole("searchbox", { name: "Filter issues" })).toBeHidden()

  await page.getByRole("button", { name: "All issues" }).click()

  // The filter survives the round trip because the list stays mounted behind the detail.
  await expect(page.getByRole("searchbox", { name: "Filter issues" })).toHaveValue("espresso")
  await expect(page.getByText("1 matching issue")).toBeVisible()
  expect(consoleErrors).toEqual([])
})

test("previews one bead with its full context", async ({ page }) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })

  await page.goto("http://127.0.0.1:4175/")
  await page.getByRole("combobox", { name: "Issue set" }).selectOption("single")

  await expect(page.getByRole("heading", { name: "Display a single bead inline" })).toBeVisible()
  await expect(page.getByText("Give one issue enough room for its full context.")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Dependencies 1" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Dependents 1" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Comments 1" })).toBeVisible()
  await expect(page.getByText("This has enough context now.")).toBeVisible()

  await page.getByRole("button", { name: "Narrow width" }).click()
  await page.getByText("This has enough context now.").evaluate((element) => {
    element.textContent = "a".repeat(500)
  })
  const widget = page.getByRole("region", { name: "Widget preview, 360 pixels wide" })
  await expect
    .poll(() => widget.evaluate((element) => element.scrollWidth <= element.clientWidth))
    .toBe(true)
  expect(consoleErrors).toEqual([])
})
