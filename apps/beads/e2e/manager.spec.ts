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

  await page.getByRole("button", { name: "New task" }).click()
  await page.getByRole("textbox", { name: "Title" }).fill("Created in browser")
  await page.getByRole("textbox", { name: "Description" }).fill("Complete packaged flow")
  await page.getByRole("textbox", { name: "Labels" }).fill("e2e")
  await page.getByRole("button", { name: "Create task" }).click()
  await page.getByText("Created in browser").click()

  await page.getByRole("textbox", { name: "New label" }).fill("reviewed")
  await page.getByRole("button", { name: "Add label" }).click()
  await expect(page.getByRole("complementary").getByText("reviewed")).toBeVisible()

  await page.getByRole("textbox", { name: "Dependency ID" }).fill("bd-test.1")
  await page.getByRole("button", { name: "Add dependency" }).click()
  await expect(page.getByText(/bd-test\.1 Packaged task manager works/)).toBeVisible()

  await page.getByRole("textbox", { name: "New comment" }).fill("--file=/etc/hosts")
  await page.getByRole("button", { name: "Add comment" }).click()
  await expect(page.getByText("--file=/etc/hosts")).toBeVisible()

  await page.getByRole("button", { name: "Edit task" }).click()
  await page.getByRole("textbox", { name: "Title" }).fill("Edited in browser")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("heading", { name: "Edited in browser" })).toBeVisible()

  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Delete task" }).click()
  await expect(page.getByRole("heading", { name: "Edited in browser" })).not.toBeVisible()
})
