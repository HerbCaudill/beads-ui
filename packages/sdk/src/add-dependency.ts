import type { DependencyType, SdkOptions } from "./types.js"

/** Add a dependency between two issues in the configured workspace. */
export async function addDependency(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Identifier of the issue that depends on another issue. */
  issueId: string,
  /** Identifier of the issue being depended on. */
  dependsOnId: string,
  /** Semantic relationship between the two issues. */
  type: DependencyType = "blocks",
): Promise<void> {
  await options.runner({
    args: ["dep", "add", issueId, dependsOnId, "--type", type, "--json"],
    cwd: options.cwd,
  })
}
