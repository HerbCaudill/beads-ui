import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { BEADS_APP_RESOURCE_URI } from "./constants.js"
import { formatIssueDetail } from "./format-issue-detail.js"
import type { CreateBeadsMcpServerOptions } from "./types.js"

/** Register the read-only issue-detail query. */
export function registerGetIssueTool(
  /** MCP server receiving the tool. */
  server: McpServer,
  /** Fixed workspace data dependencies. */
  options: CreateBeadsMcpServerOptions,
): void {
  registerAppTool(
    server,
    "get_issue",
    {
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
        title: "Get Beads issue",
      },
      description: "Get complete details for one issue in the current repository.",
      inputSchema: {
        id: z.string().min(1).describe("Beads issue ID, such as bd-123."),
      },
      _meta: {
        ui: {
          resourceUri: BEADS_APP_RESOURCE_URI,
          visibility: ["model", "app"],
        },
      },
      title: "Get Beads issue",
    },
    async ({ id }) => {
      const issue = await options.getIssue(id)
      return {
        content: [{ type: "text", text: formatIssueDetail(issue) }],
        structuredContent: {
          issue,
          workspace: options.workspace,
        },
      }
    },
  )
}
