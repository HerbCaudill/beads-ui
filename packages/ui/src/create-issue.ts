import { fetchJson } from "./fetch-json.js"
import type { Issue, TaskDraft } from "./types.js"

/** Create a task through the local API. */
export function createIssue(
  /** Fields entered in the creation form. */
  draft: TaskDraft,
): Promise<Issue> {
  return fetchJson<Issue>("/api/issues", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft),
  })
}
