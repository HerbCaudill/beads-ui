import { sendApiRequest } from "./send-api-request.js"

/** Remove a label from a task. */
export function removeLabel(
  /** Stable identifier of the task to change. */
  issueId: string,
  /** Label to remove. */
  label: string,
): Promise<void> {
  return sendApiRequest(
    `/api/issues/${encodeURIComponent(issueId)}/labels/${encodeURIComponent(label)}`,
    {
      method: "DELETE",
    },
  )
}
