import { createRoot } from "react-dom/client"

import "./app.css"
import { BeadsApp } from "./BeadsApp.js"

const root = document.getElementById("root")
if (!root) throw new Error("Missing MCP App root element")

createRoot(root).render(<BeadsApp />)
