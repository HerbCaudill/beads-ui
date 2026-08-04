import { expect, test } from "@playwright/test"

test("serves the fixed workspace API and retained Beads View workflow", async ({
  page,
  request,
}) => {
  const workspace = await request.get("/api/workspace")
  const issues = await request.get("/api/issues")

  expect(await workspace.json()).toEqual({
    name: "workspace",
    path: expect.stringContaining("apps/beads-ui/e2e/fixtures/workspace"),
  })
  expect(await issues.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "bd-test.1", isReady: true }),
      expect.objectContaining({ id: "bd-blocked", isReady: false }),
    ]),
  )

  await page.goto("/")
  await expect(page).toHaveTitle("Beads UI")
  await expect(page.getByRole("textbox", { name: "New task title" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Packaged task manager works" })).toBeVisible()

  const sidebar = page.getByRole("complementary", { name: "Task list sidebar" })
  const separator = page.getByRole("separator", { name: "Resize task list sidebar" })
  const separatorBox = await separator.boundingBox()
  if (!separatorBox) throw new Error("Task list sidebar separator is not visible")

  await page.mouse.move(
    separatorBox.x + separatorBox.width / 2,
    separatorBox.y + separatorBox.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(separatorBox.x + separatorBox.width / 2 + 100, separatorBox.y + 100)
  await page.mouse.up()
  await expect(sidebar).toHaveCSS("width", "468px")

  await page
    .getByRole("combobox", { name: "Search tasks" })
    .fill("status:open priority:P2 is:ready Packaged")
  await expect(page.getByRole("button", { name: "Packaged task manager works" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Packaged blocked task" })).not.toBeVisible()
  await page.getByRole("combobox", { name: "Search tasks" }).clear()

  await page.getByRole("textbox", { name: "New task title" }).fill("Created in browser")
  await page.getByRole("textbox", { name: "New task title" }).press("Enter")
  await page.getByRole("button", { name: "Created in browser" }).click()

  await expect(page).toHaveURL(/\/issue\/bd-test\.2$/)
  await expect(page.getByRole("dialog", { name: "Task details" })).toBeVisible()
  const parentBox = await page.getByRole("combobox", { name: "Parent" }).boundingBox()
  if (!parentBox) throw new Error("Parent selector is not visible")
  expect(parentBox.width).toBeLessThanOrEqual(384)
  await page.reload()
  await expect(page.getByPlaceholder("Task title")).toHaveValue("Created in browser")

  await page.getByPlaceholder("Task title").fill("Edited in browser")
  await page.getByPlaceholder("Add description...").fill("Complete packaged flow")
  await expect(page.getByRole("button", { name: "Edited in browser" })).toBeVisible()

  await page.getByRole("button", { name: "Add label" }).click()
  await page.getByPlaceholder("Label name").fill("reviewed")
  await page.getByRole("button", { name: "Add", exact: true }).click()
  await expect(page.getByText("reviewed", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Add blocker" }).click()
  await page.getByRole("option", { name: /Packaged task manager works/ }).click()
  await expect(page.getByRole("button", { name: "Packaged task manager works" })).toHaveCount(2)

  await page.getByRole("textbox", { name: "Add comment" }).fill("--file=/etc/hosts")
  await page.getByRole("button", { name: "Add comment" }).click()
  await expect(page.getByRole("textbox", { name: "Add comment" })).toBeEmpty()
  await expect(page.getByText("--file=/etc/hosts", { exact: true })).toBeVisible()

  await page.keyboard.press("ControlOrMeta+/")
  await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible()
  const hotkeysDialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: "Keyboard shortcuts" }) })
  await hotkeysDialog.getByRole("button", { name: "Close" }).first().click()

  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await page.getByRole("button", { name: "Yes, delete" }).click()
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("button", { name: "Edited in browser" })).not.toBeVisible()
})
