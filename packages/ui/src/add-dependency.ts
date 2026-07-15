import { sendApiRequest } from "./send-api-request.js"

/** Add a blocking dependency to a task. */
export function addDependency(
  /** Stable identifier of the blocked task. */
  issueId: string,
  /** Stable identifier of the blocking task. */
  dependsOnId: string,
): Promise<void> {
  return sendApiRequest(`/api/issues/${encodeURIComponent(issueId)}/dependencies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dependsOnId, type: "blocks" }),
  })
}
