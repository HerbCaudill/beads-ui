import type { SdkOptions } from "./types.js"

/** Remove a dependency between two issues in the configured workspace. */
export async function removeDependency(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Identifier of the issue that currently depends on another issue. */
  issueId: string,
  /** Identifier of the issue currently being depended on. */
  dependsOnId: string,
): Promise<void> {
  await options.runner({
    args: ["dep", "remove", issueId, dependsOnId, "--json"],
    cwd: options.cwd,
  })
}
