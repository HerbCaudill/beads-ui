/** Issue status values. */
export type Status = "open" | "in_progress" | "closed"

/** Known status values in canonical order. */
export const STATUSES: readonly Status[] = ["open", "in_progress", "closed"]

/**
 * Map canonical status to display label.
 */
export function statusLabel(status: string | null | undefined): string {
  switch ((status ?? "").toString()) {
    case "open":
      return "Open"
    case "in_progress":
      return "In progress"
    case "closed":
      return "Closed"
    default:
      return (status ?? "").toString() || "Open"
  }
}
