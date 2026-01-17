/**
 * Issue-related type definitions.
 *
 * Shared between app/ and server/ for type-safe issue handling.
 */

/**
 * Minimal issue shape for sorting operations.
 * Contains only the fields used by sort comparators.
 */
export interface IssueLite {
  id: string
  title?: string
  status?: "open" | "in_progress" | "closed"
  priority?: number
  issue_type?: string
  created_at?: number
  updated_at?: number
  closed_at?: number | null
}

/**
 * Comparator function for sorting IssueLite objects.
 */
export type IssueLiteComparator = (a: IssueLite, b: IssueLite) => number

/**
 * Minimal reference to another issue (used in dependencies).
 */
export interface DependencyRef {
  id: string
  title?: string
  status?: string
  priority?: number
  issue_type?: string
  created_at?: number
  updated_at?: number
  closed_at?: number | null
}

/**
 * Comment on an issue.
 */
export interface Comment {
  id: number
  author?: string
  text: string
  created_at?: string
}

/**
 * Full issue detail with all fields.
 */
export interface IssueDetail {
  id: string
  title?: string
  description?: string
  design?: string
  acceptance?: string
  notes?: string
  status?: string
  assignee?: string | null
  priority?: number
  issue_type?: string
  epic_id?: string | null
  labels?: string[]
  dependencies?: DependencyRef[]
  dependents?: DependencyRef[]
  comments?: Comment[]
  created_at?: number
  updated_at?: number
  closed_at?: number | null
}

/**
 * Issue reference with minimal timestamp fields (for list views).
 */
export interface IssueRef {
  id: string
  created_at?: number
  updated_at?: number
  closed_at?: number | null
}

/**
 * Issue with common list fields.
 */
export interface Issue extends IssueRef {
  title?: string
  status?: string
  priority?: number
  issue_type?: string
  epic_id?: string | null
  assignee?: string | null
  labels?: string[]
  dependencies?: DependencyRef[]
  dependents?: DependencyRef[]
}

/**
 * Normalized issue item from server list responses.
 */
export interface NormalizedIssue extends Record<string, unknown> {
  id: string
  created_at: number
  updated_at: number
  closed_at: number | null
}
