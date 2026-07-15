import { sendApiRequest } from "./send-api-request.js"

/** Remove a dependency from a task. */
export function removeDependency(
  /** Stable identifier of the currently blocked task. */
  issueId: string,
  /** Stable identifier of the dependency to remove. */
  dependsOnId: string,
): Promise<void> {
  return sendApiRequest(
    `/api/issues/${encodeURIComponent(issueId)}/dependencies/${encodeURIComponent(dependsOnId)}`,
    { method: "DELETE" },
  )
}
