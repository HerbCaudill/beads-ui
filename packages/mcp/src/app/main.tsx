import { createRoot } from "react-dom/client"

import "./app.css"
import { BeadsApp } from "./BeadsApp.js"

const root = document.getElementById("root")
if (!root) throw new Error("Missing MCP App root element")

if (import.meta.env.DEV) {
  import("./PreviewApp.js").then(({ PreviewApp }) => createRoot(root).render(<PreviewApp />))
} else {
  createRoot(root).render(<BeadsApp />)
}
