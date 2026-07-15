/** Send an API request that has no response body. */
export async function sendApiRequest(
  /** Same-origin API path. */
  path: string,
  /** Fetch request settings. */
  init: RequestInit,
): Promise<void> {
  const response = await fetch(path, init)
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
}
