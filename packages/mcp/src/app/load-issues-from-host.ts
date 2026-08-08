import type { App } from "@modelcontextprotocol/ext-apps"

import { parseIssueListResult } from "./parse-issue-list-result.js"
import type { IssueListResult } from "./types.js"

/** Refresh an issue list by repeating its query through the MCP host. */
export async function loadIssuesFromHost(
  /** Connected MCP App bridge. */
  app: Pick<App, "callServerTool">,
  /** Current issue list whose query should be repeated. */
  currentResult: IssueListResult,
): Promise<IssueListResult> {
  const toolResult = await app.callServerTool({
    arguments: {
      includeClosed: currentResult.includeClosed,
      ...(currentResult.search ? { search: currentResult.search } : {}),
    },
    name: "list_issues",
  })
  if (toolResult.isError) throw new Error("Beads could not refresh the issue list.")

  const parsed = parseIssueListResult(toolResult.structuredContent)
  if (!parsed) throw new Error("The host returned an unsupported issue list.")

  return parsed
}
