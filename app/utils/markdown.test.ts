import { describe, expect, test } from "vitest"
import { renderMarkdown } from "./markdown.js"

describe("utils/markdown", () => {
  test("renders empty input", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown("")

    expect(host.textContent).toBe("")
  })

  test("renders headings", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown("# Title\n\n### Sub")

    const h1 = host.querySelector("h1")
    const h3 = host.querySelector("h3")
    expect(h1?.textContent).toBe("Title")
    expect(h3?.textContent).toBe("Sub")
  })

  test("renders paragraphs with and without blank lines", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown("First line\ncontinues\n\nSecond para")

    const ps = host.querySelectorAll("p")
    expect(ps.length).toBe(2)
    expect(ps[0]?.textContent).toBe("First line\ncontinues")
    expect(ps[1]?.textContent).toBe("Second para")
  })

  test("renders unordered list items", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown("- a\n- b")

    const items = host.querySelectorAll("ul li")
    expect(items.length).toBe(2)
    expect(items[0]?.textContent).toBe("a")
    expect(items[1]?.textContent).toBe("b")
  })

  test("renders ordered list items", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown("1. a\n2. b")

    const items = host.querySelectorAll("ol li")
    expect(items.length).toBe(2)
    expect(items[0]?.textContent).toBe("a")
    expect(items[1]?.textContent).toBe("b")
  })

  test("renders fenced code block", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown("```\nline1\nline2\n```")

    const code = host.querySelector("pre > code") as HTMLElement
    expect((code.textContent ?? "").trimEnd()).toBe("line1\nline2")
  })

  test("renders inline code", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown("text `code` end")

    const code = host.querySelector("p code") as HTMLElement
    expect(code.textContent).toBe("code")
  })

  test("renders http and mailto links", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown(
      "[web](https://example.com) and [mail](mailto:test@example.com)",
    )

    const hrefs = Array.from(host.querySelectorAll("a")).map(a => a.getAttribute("href"))
    expect(hrefs).toEqual(["https://example.com", "mailto:test@example.com"])
  })

  test("sanitizes unsafe link schemes", () => {
    const host = document.createElement("div")

    host.innerHTML = renderMarkdown("x [danger](javascript:alert(1)) y")

    const hrefs = Array.from(host.querySelectorAll("a")).map(a => a.getAttribute("href") ?? "")
    // DOMPurify removes/neutralizes javascript: links
    expect(hrefs.some(h => h.startsWith("javascript:"))).toBe(false)
  })
})
