import type { SdkOptions } from "./types.js"

/** Add a label to an issue in the configured Beads workspace. */
export async function addLabel(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Stable identifier of the issue to label. */
  issueId: string,
  /** Label to attach. */
  label: string,
): Promise<void> {
  await options.runner({
    args: ["label", "add", "--json", "--", issueId, label],
    cwd: options.cwd,
  })
}
