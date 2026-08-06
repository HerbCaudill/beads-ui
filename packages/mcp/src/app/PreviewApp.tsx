import { useState } from "react"

import "./preview.css"
import { BeadsView } from "./BeadsView.js"
import { previewWidthLabels, previewWidths } from "./preview-config.js"
import { loadPreviewIssue, previewResults } from "./preview-results.js"
import type { PreviewScenario, PreviewTheme, PreviewWidth } from "./types.js"

/** Render the production issue-list view inside an interactive browser preview. */
export function PreviewApp() {
  const [scenario, setScenario] = useState<PreviewScenario>("active")
  const [theme, setTheme] = useState<PreviewTheme>("light")
  const [width, setWidth] = useState<PreviewWidth>("wide")

  return (
    <div className="preview-page">
      <header className="preview-header">
        <div>
          <p className="preview-eyebrow">Development</p>
          <h1>MCP widget preview</h1>
        </div>
        <p>Uses the same issue views bundled into the MCP App.</p>
      </header>

      <section className="preview-controls" aria-label="Preview controls">
        <label className="preview-select">
          <span>Issue set</span>
          <select
            aria-label="Issue set"
            onChange={(event) => setScenario(event.currentTarget.value as PreviewScenario)}
            value={scenario}
          >
            <option value="active">Active issues</option>
            <option value="all">All statuses</option>
            <option value="single">Single issue</option>
            <option value="empty">Empty state</option>
          </select>
        </label>

        <fieldset className="preview-toggle">
          <legend>Theme</legend>
          <div>
            <button
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
              type="button"
            >
              Light theme
            </button>
            <button aria-pressed={theme === "dark"} onClick={() => setTheme("dark")} type="button">
              Dark theme
            </button>
          </div>
        </fieldset>

        <fieldset className="preview-toggle">
          <legend>Host width</legend>
          <div>
            <button
              aria-pressed={width === "narrow"}
              onClick={() => setWidth("narrow")}
              type="button"
            >
              Narrow width
            </button>
            <button aria-pressed={width === "wide"} onClick={() => setWidth("wide")} type="button">
              Wide width
            </button>
          </div>
        </fieldset>
      </section>

      <section className="preview-stage">
        <div
          aria-label={`Widget preview, ${previewWidthLabels[width]}`}
          className="preview-frame"
          data-theme={theme}
          role="region"
          style={{ maxWidth: previewWidths[width] }}
        >
          <BeadsView
            key={scenario}
            loadIssue={loadPreviewIssue}
            result={previewResults[scenario]}
          />
        </div>
      </section>
    </div>
  )
}
