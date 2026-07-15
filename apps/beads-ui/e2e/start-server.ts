import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"

/** Start the built CLI against a deterministic fake Beads workspace. */
function startServer(): void {
  const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures")
  const stateDirectory = mkdtempSync(join(tmpdir(), "beads-e2e-"))
  const statePath = join(stateDirectory, "state.json")
  writeFileSync(
    statePath,
    JSON.stringify({
      issues: [
        {
          comments: [],
          created_at: "2026-07-15T10:00:00Z",
          dependencies: [],
          id: "bd-test.1",
          issue_type: "task",
          labels: [],
          priority: 2,
          status: "open",
          title: "Packaged task manager works",
          updated_at: "2026-07-15T10:00:00Z",
        },
      ],
    }),
  )
  const child = spawn(
    process.execPath,
    [resolve(fixtureDirectory, "../../dist/cli.js"), "--no-open", "--port", "4173"],
    {
      cwd: resolve(fixtureDirectory, "workspace"),
      env: {
        ...process.env,
        BEADS_TEST_STATE: statePath,
        PATH: `${fixtureDirectory}/bin:${process.env.PATH ?? ""}`,
      },
      stdio: "inherit",
    },
  )

  process.once("SIGINT", () => child.kill("SIGINT"))
  process.once("SIGTERM", () => child.kill("SIGTERM"))
  child.once("exit", (code) => {
    rmSync(stateDirectory, { force: true, recursive: true })
    process.exitCode = code ?? 1
  })
}

startServer()
