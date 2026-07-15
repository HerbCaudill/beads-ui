/** Start polling a fingerprint and notify when it changes. */
export function createChangePoller(
  /** Read the current workspace fingerprint. */
  readFingerprint: () => Promise<string>,
  /** Notify connected clients after a detected change. */
  onChange: () => void,
  /** Delay between fingerprint checks. */
  intervalMs: number,
): () => void {
  let previous: string | undefined
  let reading = false

  const check = async () => {
    if (reading) return
    reading = true
    try {
      const current = await readFingerprint()
      if (previous !== undefined && current !== previous) onChange()
      previous = current
    } catch {
      // Runtime API errors remain request-scoped; polling retries on the next interval.
    } finally {
      reading = false
    }
  }

  void check()
  const timer = setInterval(() => void check(), intervalMs)

  return () => clearInterval(timer)
}
