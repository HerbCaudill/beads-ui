/** Canonical structured task-search completions. */
const SEARCH_SUGGESTIONS = [
  "is:",
  "is:ready",
  "is:root",
  "label:",
  "parent:",
  "priority:",
  "priority:P0",
  "priority:P1",
  "priority:P2",
  "priority:P3",
  "priority:P4",
  "priority:<=P0",
  "priority:<=P1",
  "priority:<=P2",
  "priority:<=P3",
  "priority:<=P4",
  "priority:>=P0",
  "priority:>=P1",
  "priority:>=P2",
  "priority:>=P3",
  "priority:>=P4",
  "status:",
  "status:blocked",
  "status:closed",
  "status:deferred",
  "status:in_progress",
  "status:open",
  "type:",
  "type:bug",
  "type:chore",
  "type:convoy",
  "type:decision",
  "type:epic",
  "type:feature",
  "type:gate",
  "type:merge-request",
  "type:molecule",
  "type:task",
] as const

/** Suggest canonical completions for the unfinished term at the end of a query. */
export function getSearchSuggestions(
  /** Current task-search query. */
  query: string,
): string[] {
  let inQuotes = false
  let termStart = 0

  for (let index = 0; index < query.length; index += 1) {
    const character = query[index]!
    if (character === '"') inQuotes = !inQuotes
    if (!inQuotes && /\s/.test(character)) termStart = index + 1
  }

  const term = query.slice(termStart)
  if (!term || inQuotes) return []

  const excluded = term.startsWith("-")
  const unprefixedTerm = excluded ? term.slice(1) : term
  const partial = unprefixedTerm.toLowerCase()
  if (!partial) return []

  const prefix = query.slice(0, termStart)
  const exclusionPrefix = excluded ? "-" : ""
  const colonIndex = unprefixedTerm.indexOf(":")
  let lastCommaIndex = -1
  let valueInQuotes = false

  for (let index = colonIndex + 1; index < unprefixedTerm.length; index += 1) {
    const character = unprefixedTerm[index]!
    if (character === '"') valueInQuotes = !valueInQuotes
    if (character === "," && !valueInQuotes) lastCommaIndex = index
  }

  if (colonIndex > 0 && lastCommaIndex > colonIndex) {
    const fieldPrefix = unprefixedTerm.slice(0, colonIndex + 1).toLowerCase()
    const completedValues = unprefixedTerm.slice(0, lastCommaIndex + 1)
    const activeValue = unprefixedTerm.slice(lastCommaIndex + 1).toLowerCase()

    return SEARCH_SUGGESTIONS.filter((suggestion) => suggestion.startsWith(fieldPrefix))
      .map((suggestion) => suggestion.slice(fieldPrefix.length))
      .filter((value) => value.startsWith(activeValue) && value !== activeValue)
      .map((value) => `${prefix}${exclusionPrefix}${completedValues}${value}`)
  }

  return SEARCH_SUGGESTIONS.filter(
    (suggestion) => suggestion.startsWith(partial) && suggestion !== partial,
  ).map((suggestion) => `${prefix}${exclusionPrefix}${suggestion}`)
}
