import type { SdkOptions } from "./types.js"

/** Permanently delete an issue from the configured Beads workspace. */
export async function deleteIssue(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Stable identifier of the issue to delete. */
  issueId: string,
): Promise<void> {
  await options.runner({
    args: ["delete", issueId, "--force", "--json"],
    cwd: options.cwd,
  })
}
