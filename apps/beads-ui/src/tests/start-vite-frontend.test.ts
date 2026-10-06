import { createServer } from "node:http"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { getAvailablePort } from "../get-available-port.js"
import { closeServer } from "../close-server.js"
import { listenOnLoopback } from "../listen-on-loopback.js"
import { startViteFrontend } from "../start-vite-frontend.js"

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

describe("startViteFrontend", () => {
  it("serves the UI and proxies API requests to the backend", async () => {
    const uiRoot = await mkdtemp(join(tmpdir(), "beads-vite-ui-"))
    await writeFile(join(uiRoot, "index.html"), "<h1>Beads UI development</h1>")
    const backend = createServer((request, response) => {
      response.setHeader("content-type", "application/json")
      response.end(JSON.stringify({ path: request.url }))
    })
    const backendPort = await listenOnLoopback(backend, 0)
    cleanups.push(() => closeServer(backend))

    const frontend = await startViteFrontend(uiRoot, `http://127.0.0.1:${backendPort}`)
    cleanups.push(frontend.close)

    await expect(fetch(frontend.url).then((response) => response.text())).resolves.toContain(
      "Beads UI development",
    )
    await expect(
      fetch(`${frontend.url}/api/issues`).then((response) => response.json()),
    ).resolves.toEqual({ path: "/api/issues" })
  })
})

it("serves the assigned port and exposes secure hot reload at the named address", async () => {
  const uiRoot = await mkdtemp(join(tmpdir(), "beads-vite-routed-"))
  await writeFile(join(uiRoot, "index.html"), "<h1>Named Beads UI</h1>")
  const port = await getAvailablePort()
  const frontend = await startViteFrontend(
    uiRoot,
    "http://127.0.0.1:1",
    port,
    "https://tofu.beads-ui.localhost",
  )
  cleanups.push(frontend.close)
  expect(frontend.url).toBe("https://tofu.beads-ui.localhost")
  const client = await fetch(`http://127.0.0.1:${port}/@vite/client`, {
    headers: { host: "tofu.beads-ui.localhost" },
  }).then((response) => response.text())
  expect(client.includes("tofu.beads-ui.localhost")).toBe(true)
  expect(/const hmrPort = 443/.test(client)).toBe(true)
  expect(client.includes('"wss"')).toBe(true)
})
