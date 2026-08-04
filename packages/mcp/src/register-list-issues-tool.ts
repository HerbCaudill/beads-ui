import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { BEADS_APP_RESOURCE_URI } from "./constants.js"
import { filterIssues } from "./filter-issues.js"
import { formatIssueList } from "./format-issue-list.js"
import { matchesIssueSearchTerms } from "./matches-issue-search-terms.js"
import { parseIssueSearchQuery } from "./parse-issue-search-query.js"
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
        "List or search issues in the current repository's Beads workspace. Completed issues are excluded unless explicitly requested.",
      inputSchema: {
        includeClosed: z
          .boolean()
          .optional()
          .describe("Include completed issues. Defaults to false."),
        search: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            "Optional search query. Bare terms search issue ID, title, and description. Use status:, label:, priority:, type:, parent:, or is:ready/is:root; commas mean OR, separate terms mean AND, a leading - excludes, and quotes preserve spaces. Priority accepts P0-P4, <=, and >=. Examples: priority:P1; priority:<=P1; status:open,blocked label:frontend; is:ready.",
          ),
      },
      _meta: {
        ui: {
          resourceUri: BEADS_APP_RESOURCE_URI,
          visibility: ["model", "app"],
        },
      },
      title: "List Beads issues",
    },
    async ({ includeClosed = false, search }) => {
      const activeIssues = filterIssues(await options.listIssues(), includeClosed)
      const searchTerms = search ? parseIssueSearchQuery(search) : undefined
      const issues = searchTerms
        ? activeIssues.filter((issue) =>
            matchesIssueSearchTerms(issue, searchTerms, options.issuePrefix),
          )
        : activeIssues
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
          ...(search ? { search } : {}),
          workspace: options.workspace,
        },
      }
    },
  )
}
