import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { ISSUE_LIST_RESOURCE_URI } from "./constants.js"
import { filterIssues } from "./filter-issues.js"
import { formatIssueList } from "./format-issue-list.js"
import type { CreateBeadsMcpServerOptions } from "./types.js"

/** Register the issue-list query and its associated inline view. */
export function registerListIssuesTool(
  /** MCP server receiving the tool. */
  server: McpServer,
  /** Fixed workspace data dependencies. */
  options: CreateBeadsMcpServerOptions,
): void {
  registerAppTool(
    server,
    "list_issues",
    {
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
        title: "List Beads issues",
      },
      description:
        "List issues in the current repository's Beads workspace. Completed issues are excluded unless explicitly requested.",
      inputSchema: {
        includeClosed: z
          .boolean()
          .optional()
          .describe("Include completed issues. Defaults to false."),
      },
      _meta: {
        ui: {
          resourceUri: ISSUE_LIST_RESOURCE_URI,
          visibility: ["model", "app"],
        },
      },
      title: "List Beads issues",
    },
    async ({ includeClosed = false }) => {
      const issues = filterIssues(await options.listIssues(), includeClosed)
      return {
        content: [
          {
            type: "text",
            text: formatIssueList(issues, options.workspace, includeClosed),
          },
        ],
        structuredContent: {
          includeClosed,
          issues,
          workspace: options.workspace,
        },
      }
    },
  )
}
