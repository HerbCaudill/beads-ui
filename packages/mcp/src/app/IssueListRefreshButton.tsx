import { IconRefresh } from "@tabler/icons-react"
import { useState } from "react"

import type { RefreshIssues } from "./types.js"

/** Refresh the issue list while keeping the current widget mounted. */
export function IssueListRefreshButton({ onRefresh }: IssueListRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string>()

  return (
    <div className="relative shrink-0">
      <button
        aria-label={
          isRefreshing
            ? "Refreshing issues"
            : error
              ? "Refresh issues. Last refresh failed."
              : "Refresh issues"
        }
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
        disabled={isRefreshing}
        onClick={() => {
          setError(undefined)
          setIsRefreshing(true)
          void onRefresh()
            .catch((cause: unknown) =>
              setError(cause instanceof Error ? cause.message : "Beads could not refresh."),
            )
            .finally(() => setIsRefreshing(false))
        }}
        title={error ?? "Refresh issues"}
        type="button"
      >
        <span className={isRefreshing ? "inline-flex animate-spin" : "inline-flex"}>
          <IconRefresh aria-hidden="true" className="size-4" />
        </span>
      </button>
      <span aria-live="polite" className="pointer-events-none absolute top-full right-0 z-10 mt-1">
        {error ? (
          <span
            className="border-destructive/30 bg-background text-destructive block w-max max-w-56 rounded-md border px-2 py-1 text-xs shadow-sm"
            title={error}
          >
            Couldn’t refresh issues.
          </span>
        ) : null}
      </span>
    </div>
  )
}

/** Props for the issue-list refresh control. */
export type IssueListRefreshButtonProps = {
  /** Reload the current issue-list query. */
  readonly onRefresh: RefreshIssues
}
