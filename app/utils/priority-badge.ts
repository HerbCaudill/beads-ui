import { priority_levels, type PriorityLevel } from "./priority.js"

/**
 * Create a colored badge for a priority value (0..4).
 */
export function createPriorityBadge(priority: number | null | undefined): HTMLSpanElement {
  const p = typeof priority === "number" ? priority : 2
  const el = document.createElement("span")
  el.className = "priority-badge"
  el.classList.add(`is-p${Math.max(0, Math.min(4, p))}`)
  el.setAttribute("role", "img")
  const label = labelForPriority(p)
  el.setAttribute("title", label)
  el.setAttribute("aria-label", `Priority: ${label}`)
  el.textContent = emojiForPriority(p) + " " + label
  return el
}

function labelForPriority(p: number): string {
  const i = Math.max(0, Math.min(4, p)) as PriorityLevel
  return priority_levels[i] ?? "Medium"
}

export function emojiForPriority(p: number): string {
  switch (p) {
    case 0:
      return "\u{1F525}" // 🔥
    case 1:
      return "\u26A1\uFE0F" // ⚡️
    case 2:
      return "\u{1F527}" // 🔧
    case 3:
      return "\u{1FAB6}" // 🪶
    case 4:
      return "\u{1F4A4}" // 💤
    default:
      return "\u{1F527}" // 🔧
  }
}
