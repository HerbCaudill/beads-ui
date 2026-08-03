import { App } from "@modelcontextprotocol/ext-apps"
import { useEffect, useState } from "react"

import { applyHostContext } from "./apply-host-context.js"
import { BeadsView } from "./BeadsView.js"
import { parseBeadsResult } from "./parse-beads-result.js"
import type { BeadsResult } from "./types.js"

/** Connect to the MCP host and render supported Beads tool results. */
export function BeadsApp() {
  const [result, setResult] = useState<BeadsResult>()
  const [resultError, setResultError] = useState<string>()
  const [connectionError, setConnectionError] = useState<Error>()

  useEffect(() => {
    const app = new App({ name: "Beads issue view", version: "0.1.0" }, {})
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
      <main className="app-message app-message--error">
        <strong>Couldn’t show Beads</strong>
        <span>{resultError ?? connectionError?.message}</span>
      </main>
    )
  }

  if (!result) {
    return (
      <main className="app-message" aria-live="polite">
        <span className="loading-dot" />
        <span>Loading Beads…</span>
      </main>
    )
  }

  return <BeadsView result={result} />
}
