import type { CommandRunner } from "@beads/sdk"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import request from "supertest"
import { describe, expect, it, vi } from "vitest"

import { createApp } from "../create-app.js"

describe("static application", () => {
  it("serves assets and the application shell from the configured directory", async () => {
    const temporaryDir = await mkdtemp(join(tmpdir(), "beads-static-"))
    const staticDir = join(temporaryDir, ".npm", "ui")
    const assetsDir = join(staticDir, "assets")
    await mkdir(assetsDir, { recursive: true })
    await writeFile(join(staticDir, "index.html"), "<main>Beads UI</main>")
    await writeFile(join(assetsDir, "app.js"), "console.log('beads')")
    const runner = vi.fn<CommandRunner>()
    const app = createApp({ cwd: "/workspace", runner, staticDir })

    const asset = await request(app).get("/assets/app.js")
    const route = await request(app).get("/issue/bd-1.2")

    expect(asset.status).toBe(200)
    expect(asset.text).toContain("console.log('beads')")
    expect(route.status).toBe(200)
    expect(route.text).toContain("Beads UI")
  })
})
