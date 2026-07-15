import { createCommandRunner } from "@beads/sdk"
import open from "open"
import { fileURLToPath } from "node:url"

import { assertSupportedNode } from "./assert-supported-node.js"
import { executeCommand } from "./execute-command.js"
import { getAvailablePort } from "./get-available-port.js"
import { installDevelopmentShutdownHandlers } from "./install-development-shutdown-handlers.js"
import { parseCliOptions } from "./parse-cli-options.js"
import { defaultCreateServer } from "./start-application.js"
import { startDevelopmentApplication } from "./start-development-application.js"
import { startViteFrontend } from "./start-vite-frontend.js"

try {
  assertSupportedNode(process.versions.node)
  const options = parseCliOptions(process.argv.slice(2))
  const workspace = fileURLToPath(new URL("../../..", import.meta.url))
  const uiRoot = fileURLToPath(new URL("../../../packages/ui", import.meta.url))
  const application = await startDevelopmentApplication(workspace, options, {
    createServer: defaultCreateServer,
    findPort: getAvailablePort,
    openUrl: open,
    runner: createCommandRunner(executeCommand),
    startFrontend: (backendUrl) => startViteFrontend(uiRoot, backendUrl, options.port),
    writeLine: (line) => console.log(line),
  })
  installDevelopmentShutdownHandlers(application)
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause))
  process.exitCode = 1
}
