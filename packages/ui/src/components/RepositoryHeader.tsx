import { useEffect, useState } from "react"

import { apiFetch } from "../lib/apiClient"

/** Show the name of the repository managed by this application. */
export function RepositoryHeader(_props: Props) {
  const [repositoryName, setRepositoryName] = useState("Beads UI")

  useEffect(() => {
    const abortController = new AbortController()

    void apiFetch("/api/workspace", { signal: abortController.signal }).then(
      async (response) => {
        if (!response.ok) return

        const workspace = (await response.json()) as WorkspaceResponse
        setRepositoryName(workspace.name)
      },
      () => undefined,
    )

    return () => abortController.abort()
  }, [])

  return (
    <header className="border-border flex h-12 shrink-0 items-center border-b px-4">
      <h1 className="truncate text-base font-semibold">{repositoryName}</h1>
    </header>
  )
}

/** Props accepted by the repository header. */
type Props = Record<string, never>

/** Workspace metadata returned by the application server. */
type WorkspaceResponse = {
  /** Repository directory name. */
  name: string
  /** Canonical repository path. */
  path: string
}
