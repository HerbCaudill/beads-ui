import { describe, expect, it, vi } from "vitest"

import { subscribeToWorkspaceChanges } from "../subscribe-to-workspace-changes.js"
import type { WorkspaceSocket } from "../types.js"

describe("subscribeToWorkspaceChanges", () => {
  it("notifies for workspace change messages and closes cleanly", () => {
    let receive: ((event: MessageEvent<string>) => void) | undefined
    const close = vi.fn()
    const createSocket = vi.fn(
      (): WorkspaceSocket => ({
        addEventListener: (_type, listener) => {
          receive = listener
        },
        close,
      }),
    )
    const onChange = vi.fn()

    const unsubscribe = subscribeToWorkspaceChanges(onChange, createSocket)
    receive?.({ data: JSON.stringify({ type: "workspace_changed" }) } as MessageEvent<string>)
    unsubscribe()

    expect(createSocket).toHaveBeenCalledWith(expect.stringMatching(/^ws:\/\/.*\/api\/events$/))
    expect(onChange).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
  })
})
