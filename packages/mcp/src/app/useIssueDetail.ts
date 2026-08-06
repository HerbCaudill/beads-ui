import { useCallback, useRef, useState } from "react"

import type { IssueResult, LoadIssue } from "./types.js"

/**
 * Track the issue the list has drilled into.
 *
 * Loads run against the host, so a request that is superseded — by opening
 * another issue, or by going back — is ignored when it settles.
 */
export function useIssueDetail(
  /** Loader supplied by the host, absent when drill-down is unavailable. */
  loadIssue?: LoadIssue,
): IssueDetailNavigation {
  const [state, setState] = useState<IssueDetailState>({ status: "closed" })
  const latestRequest = useRef(0)

  const open = useCallback(
    (id: string) => {
      if (!loadIssue) return

      const request = ++latestRequest.current
      setState({ id, status: "loading" })
      loadIssue(id).then(
        (result) => {
          if (latestRequest.current === request) setState({ id, result, status: "open" })
        },
        (cause: unknown) => {
          if (latestRequest.current !== request) return
          setState({
            id,
            message: cause instanceof Error ? cause.message : String(cause),
            status: "error",
          })
        },
      )
    },
    [loadIssue],
  )

  const close = useCallback(() => {
    latestRequest.current += 1
    setState({ status: "closed" })
  }, [])

  return { close, open, state }
}

/** Drill-down state and the controls that change it. */
export type IssueDetailNavigation = {
  /** Return to the issue list, abandoning any in-flight load. */
  readonly close: () => void
  /** Drill into one issue by ID. */
  readonly open: (id: string) => void
  /** Current drill-down state. */
  readonly state: IssueDetailState
}

/** What the widget is showing in place of the issue list. */
export type IssueDetailState =
  | { readonly status: "closed" }
  | { readonly id: string; readonly status: "loading" }
  | { readonly id: string; readonly result: IssueResult; readonly status: "open" }
  | { readonly id: string; readonly message: string; readonly status: "error" }
