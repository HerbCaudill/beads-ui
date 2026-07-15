#!/usr/bin/env node

import { createCommandRunner } from "@beads/sdk"
import open from "open"
import { fileURLToPath } from "node:url"

import { assertSupportedNode } from "./assert-supported-node.js"
import { executeCommand } from "./execute-command.js"
import { getAvailablePort } from "./get-available-port.js"
import { installShutdownHandlers } from "./install-shutdown-handlers.js"
import { parseCliOptions } from "./parse-cli-options.js"
import { defaultCreateServer, startApplication } from "./start-application.js"

try {
  assertSupportedNode(process.versions.node)
  const options = parseCliOptions(process.argv.slice(2))
  const application = await startApplication(process.cwd(), options, {
    createServer: defaultCreateServer,
    findPort: getAvailablePort,
    openUrl: open,
    runner: createCommandRunner(executeCommand),
    staticDir: fileURLToPath(new URL("./ui", import.meta.url)),
    writeLine: (line) => console.log(line),
  })
  installShutdownHandlers(application.server)
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause))
  process.exitCode = 1
}
