import type { App } from "@modelcontextprotocol/ext-apps"

import { parseBeadsResult } from "./parse-beads-result.js"
import type { IssueResult } from "./types.js"

/**
 * Load one issue by calling the `get_issue` tool through the MCP host.
 *
 * The tool is registered with `visibility: ["model", "app"]`, so the widget can
 * call it directly without adding a turn to the conversation.
 */
export async function loadIssueFromHost(
  /** Connected MCP App bridge. */
  app: Pick<App, "callServerTool">,
  /** Beads issue ID to load. */
  id: string,
): Promise<IssueResult> {
  const toolResult = await app.callServerTool({ arguments: { id }, name: "get_issue" })
  if (toolResult.isError) throw new Error(`Beads could not load ${id}.`)

  const parsed = parseBeadsResult(toolResult.structuredContent)
  if (!parsed || "issues" in parsed) {
    throw new Error(`The host returned an unsupported result for ${id}.`)
  }

  return parsed
}
