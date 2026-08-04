import type { StartMcpDependencies } from "./types.js"

/** Validate a workspace and expose it over an MCP stdio transport. */
export async function startMcpApplication(
  /** Directory from which the command was launched. */
  cwd: string,
  /** Runtime dependencies for the local MCP server. */
  dependencies: StartMcpDependencies,
): Promise<void> {
  const workspace = await dependencies.validateWorkspace(cwd)
  const [issuePrefix, viewHtml] = await Promise.all([
    dependencies.getIssuePrefix(workspace),
    dependencies.readViewHtml(),
  ])
  const server = dependencies.createServer({
    getIssue: (id) => dependencies.getIssue(workspace, id),
    issuePrefix,
    listIssues: () => dependencies.listIssues(workspace),
    viewHtml,
    workspace,
  })
  await server.connect(dependencies.transport)
}
