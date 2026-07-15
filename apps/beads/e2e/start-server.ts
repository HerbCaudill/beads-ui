import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

/** Start the built CLI against a deterministic fake Beads workspace. */
function startServer(): void {
  const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures")
  const child = spawn(
    process.execPath,
    [resolve(fixtureDirectory, "../../dist/cli.js"), "--no-open", "--port", "4173"],
    {
      cwd: resolve(fixtureDirectory, "workspace"),
      env: { ...process.env, PATH: `${fixtureDirectory}/bin:${process.env.PATH ?? ""}` },
      stdio: "inherit",
    },
  )

  process.once("SIGINT", () => child.kill("SIGINT"))
  process.once("SIGTERM", () => child.kill("SIGTERM"))
  child.once("exit", (code) => {
    process.exitCode = code ?? 1
  })
}

startServer()
