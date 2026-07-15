/** Reject runtimes that cannot support the published application. */
export function assertSupportedNode(
  /** Node semantic version without the leading `v`. */
  version: string,
): void {
  const major = Number(version.split(".")[0])
  if (!Number.isInteger(major) || major < 22) {
    throw new Error(`Node.js 22 or newer is required; current version is ${version}`)
  }
}
