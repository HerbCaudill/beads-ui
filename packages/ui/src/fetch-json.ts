/** Fetch and decode one JSON API response. */
export async function fetchJson<Type>(
  /** Same-origin API path. */
  path: string,
  /** Optional fetch request settings. */
  init?: RequestInit,
): Promise<Type> {
  const response = await fetch(path, init)
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return (await response.json()) as Type
}
