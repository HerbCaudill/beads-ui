import type { CommandRunner } from "@beads/sdk"
import { createServer as createBeadsServer, type ServerOptions } from "@beads/server"
import type { Server } from "node:http"

import { closeServer } from "./close-server.js"
import { listenOnLoopback } from "./listen-on-loopback.js"
import { selectPort } from "./select-port.js"
import type { CliOptions } from "./types.js"
import { validateWorkspace } from "./validate-workspace.js"
import { verifyBd } from "./verify-bd.js"

/** Validate the workspace and start its fixed, loopback-only manager. */
export async function startApplication(
  /** Directory from which the command was launched. */
  cwd: string,
  /** Parsed command-line options. */
  options: CliOptions,
  /** Runtime dependencies. */
  dependencies: StartDependencies,
): Promise<StartedApplication> {
  const workspace = await validateWorkspace(cwd, () => verifyBd(cwd, dependencies.runner))
  const selectedPort = await selectPort(options.port, dependencies.findPort)
  const server = dependencies.createServer({
    cwd: workspace,
    runner: dependencies.runner,
    staticDir: dependencies.staticDir,
  })
  const port = await listenOnLoopback(server, selectedPort)
  const url = `http://127.0.0.1:${port}`

  dependencies.writeLine(`Beads manager: ${url}`)
  dependencies.writeLine(`Workspace: ${workspace}`)
  if (options.openBrowser) {
    try {
      await dependencies.openUrl(url)
    } catch (cause) {
      await closeServer(server)
      throw cause
    }
  }

  return { server, url, workspace }
}

/** Running application details used by lifecycle handling. */
export type StartedApplication = {
  /** Listening HTTP server. */
  readonly server: Server
  /** Browser URL for the application. */
  readonly url: string
  /** Canonical workspace managed by the server. */
  readonly workspace: string
}

/** Runtime dependencies used to start the application. */
export type StartDependencies = {
  /** Create the same-origin application server. */
  readonly createServer: (options: ServerOptions) => Server
  /** Find an available loopback port. */
  readonly findPort: (requestedPort?: number) => Promise<number>
  /** Launch a URL in the system browser. */
  readonly openUrl: (url: string) => Promise<unknown>
  /** Execute supported Beads commands. */
  readonly runner: CommandRunner
  /** Built UI asset directory. */
  readonly staticDir: string
  /** Write one terminal output line. */
  readonly writeLine: (line: string) => void
}

/** Default server factory used by the executable. */
export const defaultCreateServer: StartDependencies["createServer"] = createBeadsServer
