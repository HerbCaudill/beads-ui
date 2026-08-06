import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parse, type ParseError } from "jsonc-parser"

/** Read and normalize the Peacock color configured for a workspace. */
export async function readPeacockColor(
  /** Canonical workspace directory. */
  cwd: string,
): Promise<string | null> {
  try {
    const settingsText = await readFile(resolve(cwd, ".vscode/settings.json"), "utf8")
    const parseErrors: ParseError[] = []
    const settings = parse(settingsText, parseErrors, { allowTrailingComma: true }) as unknown
    if (
      parseErrors.length > 0 ||
      typeof settings !== "object" ||
      settings === null ||
      Array.isArray(settings)
    ) {
      return null
    }

    const color = (settings as Record<string, unknown>)["peacock.color"]
    if (typeof color !== "string" || !/^#?[0-9a-f]{6}$/i.test(color)) return null

    return `#${color.replace("#", "").toLowerCase()}`
  } catch {
    return null
  }
}
