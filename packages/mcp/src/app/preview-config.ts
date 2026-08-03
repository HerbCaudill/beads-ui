import type { PreviewWidth } from "./types.js"

/** Accessible labels for simulated MCP host widths. */
export const previewWidthLabels: Record<PreviewWidth, string> = {
  narrow: "360 pixels wide",
  wide: "720 pixels wide",
}

/** Maximum widths used to simulate MCP host containers. */
export const previewWidths: Record<PreviewWidth, number> = {
  narrow: 360,
  wide: 720,
}
