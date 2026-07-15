import { fetchJson } from "./fetch-json.js"
import type { Comment } from "./types.js"

/** Add a comment to a task. */
export function addComment(
  /** Stable identifier of the task receiving the comment. */
  issueId: string,
  /** Comment body. */
  text: string,
): Promise<Comment> {
  return fetchJson<Comment>(`/api/issues/${encodeURIComponent(issueId)}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  })
}
