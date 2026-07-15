import { closeDevelopmentServers } from "./close-development-servers.js"
import { closeServer } from "./close-server.js"
import { listenOnLoopback } from "./listen-on-loopback.js"
import type {
  CliOptions,
  DevelopmentDependencies,
  StartedDevelopmentApplication,
  StartedFrontend,
} from "./types.js"
import { validateWorkspace } from "./validate-workspace.js"
import { verifyBd } from "./verify-bd.js"

/** Start the Beads backend and Vite frontend for local development. */
export async function startDevelopmentApplication(
  /** Workspace directory managed by the development server. */
  cwd: string,
  /** Parsed command-line options. */
  options: CliOptions,
  /** Development runtime dependencies. */
  dependencies: DevelopmentDependencies,
): Promise<StartedDevelopmentApplication> {
  const workspace = await validateWorkspace(cwd, () => verifyBd(cwd, dependencies.runner))
  const server = dependencies.createServer({ cwd: workspace, runner: dependencies.runner })
  const port = await listenOnLoopback(server, await dependencies.findPort())
  const backendUrl = `http://127.0.0.1:${port}`
  let frontend: StartedFrontend | undefined

  try {
    frontend = await dependencies.startFrontend(backendUrl)
    dependencies.writeLine(`Beads UI: ${frontend.url}`)
    dependencies.writeLine(`Workspace: ${workspace}`)
    if (options.openBrowser) await dependencies.openUrl(frontend.url)
  } catch (cause) {
    if (frontend) {
      await closeDevelopmentServers(frontend, server).catch(() => undefined)
    } else {
      await closeServer(server).catch(() => undefined)
    }
    throw cause
  }

  return {
    backendUrl,
    close: () => closeDevelopmentServers(frontend, server),
    url: frontend.url,
    workspace,
  }
}
