import DOMPurify from "dompurify"
import { marked } from "marked"

/**
 * Render Markdown safely as HTML using marked and DOMPurify.
 *
 * @param markdown - Markdown source text
 * @returns Sanitized HTML string
 */
export function renderMarkdown(markdown: string): string {
  const parsed = marked.parse(markdown) as string
  return DOMPurify.sanitize(parsed)
}
