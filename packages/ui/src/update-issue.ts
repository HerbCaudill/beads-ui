import { fetchJson } from "./fetch-json.js"
import type { Issue, TaskDraft } from "./types.js"

/** Update a task through the local API. */
export function updateIssue(
  /** Stable identifier of the task to update. */
  issueId: string,
  /** Editable task fields. */
  draft: TaskDraft,
): Promise<Issue> {
  return fetchJson<Issue>(`/api/issues/${encodeURIComponent(issueId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft),
  })
}
