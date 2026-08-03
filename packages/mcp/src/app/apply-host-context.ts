import {
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type App,
} from "@modelcontextprotocol/ext-apps"

/** Apply host-provided theme tokens and fonts to the inline document. */
export function applyHostContext(
  /** Current context supplied by the MCP host. */
  context: ReturnType<App["getHostContext"]>,
): void {
  if (context?.theme) applyDocumentTheme(context.theme)
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables)
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts)
}
