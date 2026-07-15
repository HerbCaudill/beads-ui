import { sendApiRequest } from "./send-api-request.js"

/** Attach a label to a task. */
export function addLabel(
  /** Stable identifier of the task to label. */
  issueId: string,
  /** Label to attach. */
  label: string,
): Promise<void> {
  return sendApiRequest(`/api/issues/${encodeURIComponent(issueId)}/labels`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label }),
  })
}
