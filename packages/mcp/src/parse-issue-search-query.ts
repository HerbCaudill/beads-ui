import type { IssueSearchField, IssueSearchTerm } from "./search-query-types.js"

/** Structured field names recognized by the issue-search parser. */
const ISSUE_SEARCH_FIELDS = new Set<IssueSearchField>([
  "is",
  "label",
  "parent",
  "priority",
  "status",
  "type",
])

/** Parse free text and structured filters from one issue-search query. */
export function parseIssueSearchQuery(
  /** Raw issue-search query. */
  query: string,
): readonly IssueSearchTerm[] {
  const terms: IssueSearchTerm[] = []
  let index = 0

  while (index < query.length) {
    while (index < query.length && /\s/.test(query[index]!)) index += 1
    if (index >= query.length) break

    const excluded = query[index] === "-"
    if (excluded) index += 1

    const start = index
    let inQuotes = false
    while (index < query.length) {
      const character = query[index]!
      if (character === '"') inQuotes = !inQuotes
      if (!inQuotes && /\s/.test(character)) break
      index += 1
    }

    const rawTerm = query.slice(start, index)
    if (!rawTerm) continue

    const colonIndex = rawTerm.indexOf(":")
    const field = rawTerm.slice(0, colonIndex).toLowerCase() as IssueSearchField
    if (colonIndex > 0 && ISSUE_SEARCH_FIELDS.has(field)) {
      const rawValue = rawTerm.slice(colonIndex + 1)
      const values: string[] = []
      let valueStart = 0
      let valueInQuotes = false

      for (let valueIndex = 0; valueIndex <= rawValue.length; valueIndex += 1) {
        const character = rawValue[valueIndex]
        if (character === '"') valueInQuotes = !valueInQuotes
        if (valueIndex < rawValue.length && (character !== "," || valueInQuotes)) continue

        const rawPart = rawValue.slice(valueStart, valueIndex).trim()
        const value =
          rawPart.startsWith('"') && rawPart.endsWith('"') ? rawPart.slice(1, -1) : rawPart
        values.push(value)
        valueStart = valueIndex + 1
      }

      terms.push({ excluded, field, kind: "filter", values })
      continue
    }

    const quoted = rawTerm.startsWith('"') && rawTerm.endsWith('"')
    terms.push({
      excluded,
      kind: "text",
      value: quoted ? rawTerm.slice(1, -1) : rawTerm,
    })
  }

  return terms
}
