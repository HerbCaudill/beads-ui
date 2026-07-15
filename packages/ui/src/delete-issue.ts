/** Permanently delete a task through the local API. */
export async function deleteIssue(
  /** Stable identifier of the task to delete. */
  issueId: string,
): Promise<void> {
  const response = await fetch(`/api/issues/${encodeURIComponent(issueId)}`, { method: "DELETE" })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
}
