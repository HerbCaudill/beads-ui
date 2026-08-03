import type { DependencyType } from "@beads/sdk"

/** Which side of the selected issue contains a related issue. */
export type RelatedIssueDirection = "dependency" | "dependent"

/**
 * Describe how a related issue connects to the selected issue.
 *
 * @param dependencyType - Beads relationship type reported by the CLI.
 * @param direction - Whether the related issue is a dependency or dependent.
 */
export function formatRelatedIssueRelationship(
  dependencyType: DependencyType,
  direction: RelatedIssueDirection,
) {
  if (dependencyType === "blocks") {
    return direction === "dependency" ? "blocks this issue" : "blocked by this issue"
  }

  if (dependencyType === "parent-child") {
    return direction === "dependency" ? "parent of this issue" : "child of this issue"
  }

  return dependencyType.replaceAll("-", " ")
}
