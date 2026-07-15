import { expect, test } from "@playwright/test"

test("serves the fixed workspace API and task manager", async ({ page, request }) => {
  const workspace = await request.get("/api/workspace")
  const issues = await request.get("/api/issues")

  expect(await workspace.json()).toEqual({
    name: "workspace",
    path: expect.stringContaining("apps/beads/e2e/fixtures/workspace"),
  })
  expect(await issues.json()).toEqual([expect.objectContaining({ id: "bd-test.1" })])

  await page.goto("/")
  await expect(page.getByRole("heading", { name: "workspace" })).toBeVisible()
  await expect(page.getByRole("button", { name: "New task" })).toBeVisible()
  await expect(page.getByText("Packaged task manager works")).toBeVisible()
})
