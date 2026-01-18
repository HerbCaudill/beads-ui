/**
 * Main React entry point.
 *
 * This module bootstraps both the legacy Lit-based UI and the new React root.
 * During the migration, both systems coexist via a portal bridge pattern.
 */
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { bootstrap as bootstrapLit, initTheme } from "./main-lit.js"

/**
 * React application root component.
 *
 * Currently a placeholder that will be expanded as components migrate from Lit.
 */
function App(): JSX.Element {
  return <></>
}

/**
 * Initialize the application.
 *
 * Bootstraps both the Lit-based UI (into #app) and the React root (into #react-root).
 */
function init(): void {
  // Initialize theme toggle
  initTheme()

  // Bootstrap the legacy Lit UI
  const appRoot = document.getElementById("app")
  if (appRoot) {
    bootstrapLit(appRoot)
  }

  // Bootstrap the React root
  const reactRoot = document.getElementById("react-root")
  if (reactRoot) {
    createRoot(reactRoot).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
}

// Run on DOMContentLoaded
if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", init)
}
