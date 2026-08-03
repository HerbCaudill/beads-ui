import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { ISSUE_LIST_RESOURCE_URI } from "./constants.js"

/** Register the bundled task-list HTML as an MCP App resource. */
export function registerIssueListResource(
  /** MCP server receiving the resource. */
  server: McpServer,
  /** Self-contained HTML document rendered by the host. */
  viewHtml: string,
): void {
  registerAppResource(
    server,
    "Beads issue list",
    ISSUE_LIST_RESOURCE_URI,
    {
      description: "Compact interactive list of issues in the current Beads workspace.",
      _meta: { ui: { prefersBorder: true } },
    },
    async () => ({
      contents: [
        {
          _meta: { ui: { prefersBorder: true } },
          mimeType: RESOURCE_MIME_TYPE,
          text: viewHtml,
          uri: ISSUE_LIST_RESOURCE_URI,
        },
      ],
    }),
  )
}
