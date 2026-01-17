import DOMPurify from "dompurify"
import { unsafeHTML } from "lit-html/directives/unsafe-html.js"
import { marked } from "marked"
import type { DirectiveResult } from "lit-html/directive.js"
import type { UnsafeHTMLDirective } from "lit-html/directives/unsafe-html.js"

/**
 * Render Markdown safely as HTML using marked and DOMPurify.
 * Returns a lit-html TemplateResult via the unsafeHTML directive so it can be
 * embedded directly in templates.
 *
 * @param markdown - Markdown source text
 */
export function renderMarkdown(markdown: string): DirectiveResult<typeof UnsafeHTMLDirective> {
  const parsed = marked.parse(markdown) as string
  const html_string = DOMPurify.sanitize(parsed)
  return unsafeHTML(html_string)
}
