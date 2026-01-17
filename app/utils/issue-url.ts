/** View types that support issue URLs. */
export type IssueView = "issues" | "epics" | "board"

/**
 * Build a canonical issue hash that retains the view.
 */
export function issueHashFor(view: IssueView, id: string): string {
  const v = view === "epics" || view === "board" ? view : "issues"
  return `#/${v}?issue=${encodeURIComponent(id)}`
}
