/** Field names supported by structured issue-search filters. */
export type IssueSearchField = "is" | "label" | "parent" | "priority" | "status" | "type"

/** One parsed free-text issue-search term. */
export type IssueSearchTextTerm = {
  /** Whether matching issues should be excluded. */
  readonly excluded: boolean
  /** Discriminator for a free-text term. */
  readonly kind: "text"
  /** Case-preserving text value. */
  readonly value: string
}

/** One parsed structured issue-search term. */
export type IssueSearchFilterTerm = {
  /** Whether matching issues should be excluded. */
  readonly excluded: boolean
  /** Structured field to inspect. */
  readonly field: IssueSearchField
  /** Discriminator for a structured filter. */
  readonly kind: "filter"
  /** Alternative values, any one of which may match. */
  readonly values: readonly string[]
}

/** One parsed issue-search term. */
export type IssueSearchTerm = IssueSearchFilterTerm | IssueSearchTextTerm
