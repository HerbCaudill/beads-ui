import type { SdkOptions } from "./types.js"

/** Remove a label from an issue in the configured Beads workspace. */
export async function removeLabel(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Stable identifier of the issue to change. */
  issueId: string,
  /** Label to detach. */
  label: string,
): Promise<void> {
  await options.runner({
    args: ["label", "remove", issueId, label, "--json"],
    cwd: options.cwd,
  })
}
