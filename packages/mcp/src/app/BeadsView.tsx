import { IconLoader2 } from "@tabler/icons-react"

import { IssueDetailFrame } from "./IssueDetailFrame.js"
import { IssueDetailView } from "./IssueDetailView.js"
import { IssueListView } from "./IssueListView.js"
import { useIssueDetail } from "./useIssueDetail.js"
import type { BeadsResult, LoadIssue, RefreshIssues } from "./types.js"

/** Render the view matching one structured Beads tool result. */
export function BeadsView({ loadIssue, refreshIssues, result }: BeadsViewProps) {
  const detail = useIssueDetail(loadIssue)

  // A single-issue result is already the detail view; there is nothing to drill into.
  if (!("issues" in result)) return <IssueDetailView result={result} />

  return (
    <>
      {/*
       * The list stays mounted behind the detail so the filter query and collapsed
       * groups survive the round trip.
       */}
      <div className={detail.state.status === "closed" ? undefined : "hidden"}>
        <IssueListView
          onOpenIssue={loadIssue && detail.open}
          onRefresh={refreshIssues}
          result={result}
        />
      </div>

      {detail.state.status !== "closed" && (
        <IssueDetailFrame onBack={detail.close}>
          {detail.state.status === "loading" && (
            <p
              aria-live="polite"
              className="text-muted-foreground m-0 flex items-center justify-center gap-2 p-6 text-xs"
            >
              <IconLoader2 aria-hidden="true" className="text-status-info size-4 animate-spin" />
              Loading {detail.state.id}…
            </p>
          )}
          {detail.state.status === "error" && (
            <p className="text-destructive m-0 p-6 text-center text-xs">{detail.state.message}</p>
          )}
          {detail.state.status === "open" && <IssueDetailView result={detail.state.result} />}
        </IssueDetailFrame>
      )}
    </>
  )
}

/** Props for the structured Beads result router. */
export type BeadsViewProps = {
  /** Loads one issue's detail on demand. Omit to disable drill-down. */
  readonly loadIssue?: LoadIssue
  /** Reloads the current issue-list query. Omit to hide the refresh control. */
  readonly refreshIssues?: RefreshIssues
  /** Parsed tool result to display. */
  readonly result: BeadsResult
}
