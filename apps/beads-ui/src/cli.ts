#!/usr/bin/env node

import { createBeadsMcpServer } from "@beads/mcp"
import { createCommandRunner, getIssue, getIssuePrefix, listIssues } from "@beads/sdk"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import open from "open"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { assertSupportedNode } from "./assert-supported-node.js"
import { executeCommand } from "./execute-command.js"
import { getAvailablePort } from "./get-available-port.js"
import { installShutdownHandlers } from "./install-shutdown-handlers.js"
import { parseCliCommand } from "./parse-cli-command.js"
import { defaultCreateServer, startApplication } from "./start-application.js"
import { startMcpApplication } from "./start-mcp-application.js"
import { validateWorkspace } from "./validate-workspace.js"
import { verifyBd } from "./verify-bd.js"

try {
  assertSupportedNode(process.versions.node)
  const runner = createCommandRunner(executeCommand)
  const command = parseCliCommand(process.argv.slice(2))

  if (command.kind === "mcp") {
    await startMcpApplication(process.cwd(), {
      createServer: createBeadsMcpServer,
      getIssue: async (workspace, id) => {
        const issue = await getIssue({ cwd: workspace, runner }, id)
        if (!issue) throw new Error(`Beads issue not found: ${id}`)
        return issue
      },
      getIssuePrefix: (workspace) => getIssuePrefix({ cwd: workspace, runner }),
      listIssues: (workspace) => listIssues({ cwd: workspace, runner }),
      readViewHtml: () =>
        readFile(fileURLToPath(new URL("./mcp-app.html", import.meta.url)), "utf8"),
      transport: new StdioServerTransport(),
      validateWorkspace: (cwd) => validateWorkspace(cwd, () => verifyBd(cwd, runner)),
    })
  } else {
    const application = await startApplication(process.cwd(), command.options, {
      createServer: defaultCreateServer,
      findPort: getAvailablePort,
      openUrl: open,
      runner,
      staticDir: fileURLToPath(new URL("./ui", import.meta.url)),
      writeLine: (line) => console.log(line),
    })
    installShutdownHandlers(application.server)
  }
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause))
  process.exitCode = 1
}
