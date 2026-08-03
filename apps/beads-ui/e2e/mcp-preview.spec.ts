import { expect, test } from "@playwright/test"

test("previews the production widget at a narrow host width", async ({ page }) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })

  await page.goto("http://127.0.0.1:4175/")
  await expect(page.getByRole("heading", { name: "MCP widget preview" })).toBeVisible()

  await page.getByRole("button", { name: "Narrow width" }).click()

  const workspaceHeading = page.getByRole("heading", { name: "beads-ui" })
  const summary = page.getByText("5 active issues")
  await expect
    .poll(async () => {
      const workspaceBox = await workspaceHeading.boundingBox()
      const summaryBox = await summary.boundingBox()
      if (!workspaceBox || !summaryBox) return false
      return summaryBox.y > workspaceBox.y + workspaceBox.height
    })
    .toBe(true)
  expect(consoleErrors).toEqual([])
})
