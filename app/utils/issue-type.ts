/** Issue type values. */
export type IssueType = "bug" | "feature" | "task" | "epic" | "chore"

/** Known issue types in canonical order for dropdowns. */
export const ISSUE_TYPES: readonly IssueType[] = ["bug", "feature", "task", "epic", "chore"]

/**
 * Return a human-friendly label for an issue type.
 */
export function typeLabel(type: string | null | undefined): string {
  switch ((type ?? "").toString().toLowerCase()) {
    case "bug":
      return "Bug"
    case "feature":
      return "Feature"
    case "task":
      return "Task"
    case "epic":
      return "Epic"
    case "chore":
      return "Chore"
    default:
      return ""
  }
}
