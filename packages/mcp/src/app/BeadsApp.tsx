import { App } from "@modelcontextprotocol/ext-apps"
import { IconLoader2 } from "@tabler/icons-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { applyHostContext } from "./apply-host-context.js"
import { BeadsView } from "./BeadsView.js"
import { loadIssueFromHost } from "./load-issue-from-host.js"
import { parseBeadsResult } from "./parse-beads-result.js"
import type { BeadsResult, LoadIssue } from "./types.js"

/** Connect to the MCP host and render supported Beads tool results. */
export function BeadsApp() {
  const [result, setResult] = useState<BeadsResult>()
  const [resultError, setResultError] = useState<string>()
  const [connectionError, setConnectionError] = useState<Error>()
  const appRef = useRef<App>(null)

  const loadIssue = useCallback<LoadIssue>((id) => {
    const app = appRef.current
    if (!app) return Promise.reject(new Error("Not connected to the MCP host."))
    return loadIssueFromHost(app, id)
  }, [])

  useEffect(() => {
    const app = new App({ name: "Beads issue view", version: "0.1.0" }, {})
    appRef.current = app
    app.addEventListener("toolresult", (toolResult) => {
      if (toolResult.isError) {
        setResultError("Beads could not load this result.")
        return
      }

      const parsedResult = parseBeadsResult(toolResult.structuredContent)
      if (!parsedResult) {
        setResultError("The host returned an unsupported Beads result.")
        return
      }

      setResultError(undefined)
      setResult(parsedResult)
    })
    app.onhostcontextchanged = (context) => applyHostContext(context)
    app
      .connect()
      .then(() => applyHostContext(app.getHostContext()))
      .catch((cause: unknown) =>
        setConnectionError(cause instanceof Error ? cause : new Error(String(cause))),
      )
  }, [])

  if (connectionError || resultError) {
    return (
      <main className="flex min-h-22 flex-col items-start justify-center gap-1 p-4 text-sm">
        <strong className="text-destructive font-medium">Couldn’t show Beads</strong>
        <span className="text-muted-foreground">{resultError ?? connectionError?.message}</span>
      </main>
    )
  }

  if (!result) {
    return (
      <main
        aria-live="polite"
        className="text-muted-foreground flex min-h-22 items-center justify-center gap-2 p-4 text-sm"
      >
        <IconLoader2 aria-hidden="true" className="text-status-info size-4 animate-spin" />
        <span>Loading Beads…</span>
      </main>
    )
  }

  return <BeadsView loadIssue={loadIssue} result={result} />
}
