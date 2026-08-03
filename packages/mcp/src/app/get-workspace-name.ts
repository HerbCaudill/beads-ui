/** Get a concise repository name from an absolute workspace path. */
export function getWorkspaceName(
  /** Absolute workspace path returned by the MCP server. */
  workspace: string,
): string {
  const segments = workspace.split(/[\\/]/).filter(Boolean)
  return segments.at(-1) ?? workspace
}
