import { IssueDetailView } from "./IssueDetailView.js"
import { IssueListView } from "./IssueListView.js"
import type { BeadsResult } from "./types.js"

/** Render the view matching one structured Beads tool result. */
export function BeadsView({ result }: BeadsViewProps) {
  if ("issues" in result) return <IssueListView result={result} />
  return <IssueDetailView result={result} />
}

/** Props for the structured Beads result router. */
export type BeadsViewProps = {
  /** Parsed tool result to display. */
  readonly result: BeadsResult
}
