/** Field names supported by structured task-search filters. */
export type SearchFilterField = "is" | "label" | "parent" | "priority" | "status" | "type"

/** One parsed free-text search term. */
export type SearchTextTerm = {
  /** Whether matching tasks should be excluded. */
  excluded: boolean
  /** Discriminator for a free-text term. */
  kind: "text"
  /** Whether the value must match as a contiguous phrase within one field. */
  quoted: boolean
  /** Case-preserving text value. */
  value: string
}

/** One parsed structured task filter. */
export type SearchFilterTerm = {
  /** Whether matching tasks should be excluded. */
  excluded: boolean
  /** Structured field to inspect. */
  field: SearchFilterField
  /** Discriminator for a structured filter. */
  kind: "filter"
  /** Alternative values, any one of which may match. */
  values: string[]
}

/** One parsed task-search term. */
export type SearchTerm = SearchFilterTerm | SearchTextTerm
