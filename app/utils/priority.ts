/** Priority level labels in order from 0 (Critical) to 4 (Backlog). */
export const priority_levels = ["Critical", "High", "Medium", "Low", "Backlog"] as const

/** A priority level (0-4). */
export type PriorityLevel = 0 | 1 | 2 | 3 | 4
