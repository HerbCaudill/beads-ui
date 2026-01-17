import type { Status } from "./status.js"

/**
 * Create a colored badge for a status value.
 */
export function createStatusBadge(status: string | null | undefined): HTMLSpanElement {
  const el = document.createElement("span")
  el.className = "status-badge"
  const s = String(status ?? "open")
  el.classList.add(`is-${s}`)
  el.setAttribute("role", "img")
  el.setAttribute("title", labelForStatus(s))
  el.setAttribute("aria-label", `Status: ${labelForStatus(s)}`)
  el.textContent = labelForStatus(s)
  return el
}

function labelForStatus(s: string): string {
  switch (s as Status) {
    case "open":
      return "Open"
    case "in_progress":
      return "In progress"
    case "closed":
      return "Closed"
    default:
      return "Unknown"
  }
}
