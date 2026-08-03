import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBeadsAppResource } from "./register-beads-app-resource.js"
import { registerGetIssueTool } from "./register-get-issue-tool.js"
import { registerListIssuesTool } from "./register-list-issues-tool.js"
import type { CreateBeadsMcpServerOptions } from "./types.js"

/** Create the MCP server that exposes the current Beads workspace. */
export function createBeadsMcpServer(
  /** Fixed workspace data and UI dependencies. */
  options: CreateBeadsMcpServerOptions,
): McpServer {
  const server = new McpServer({ name: "Beads", version: "0.1.0" })
  registerListIssuesTool(server, options)
  registerGetIssueTool(server, options)
  registerBeadsAppResource(server, options.viewHtml)
  return server
}
