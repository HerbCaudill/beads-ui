import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { BEADS_APP_RESOURCE_URI } from "./constants.js"

/** Register the bundled issue-list and issue-detail MCP App resource. */
export function registerBeadsAppResource(
  /** MCP server receiving the resource. */
  server: McpServer,
  /** Self-contained HTML document rendered by the host. */
  viewHtml: string,
): void {
  registerAppResource(
    server,
    "Beads issue view",
    BEADS_APP_RESOURCE_URI,
    {
      description: "Interactive issue lists and focused issue details for one Beads workspace.",
      _meta: { ui: { prefersBorder: true } },
    },
    async () => ({
      contents: [
        {
          _meta: { ui: { prefersBorder: true } },
          mimeType: RESOURCE_MIME_TYPE,
          text: viewHtml,
          uri: BEADS_APP_RESOURCE_URI,
        },
      ],
    }),
  )
}
