import type { StartMcpDependencies } from "./types.js"

/** Validate a workspace and expose it over an MCP stdio transport. */
export async function startMcpApplication(
  /** Directory from which the command was launched. */
  cwd: string,
  /** Runtime dependencies for the local MCP server. */
  dependencies: StartMcpDependencies,
): Promise<void> {
  const [workspace, viewHtml] = await Promise.all([
    dependencies.validateWorkspace(cwd),
    dependencies.readViewHtml(),
  ])
  const server = dependencies.createServer({
    getIssue: (id) => dependencies.getIssue(workspace, id),
    listIssues: () => dependencies.listIssues(workspace),
    viewHtml,
    workspace,
  })
  await server.connect(dependencies.transport)
}
