/** Toast visual variant. */
export type ToastVariant = "info" | "success" | "error"

/**
 * Show a transient global toast message anchored to the viewport.
 *
 * @param text - Message text.
 * @param variant - Visual variant.
 * @param duration_ms - Auto-dismiss delay in milliseconds.
 */
export function showToast(
  text: string,
  variant: ToastVariant = "info",
  duration_ms: number = 2800,
): void {
  const el = document.createElement("div")
  el.className = "toast"
  el.textContent = text
  el.style.position = "fixed"
  el.style.right = "12px"
  el.style.bottom = "12px"
  el.style.zIndex = "1000"
  el.style.color = "#fff"
  el.style.padding = "8px 10px"
  el.style.borderRadius = "4px"
  el.style.fontSize = "12px"
  if (variant === "success") {
    el.style.background = "#156d36"
  } else if (variant === "error") {
    el.style.background = "#9f2011"
  } else {
    el.style.background = "rgba(0,0,0,0.85)"
  }
  ;(document.body || document.documentElement).appendChild(el)
  setTimeout(() => {
    try {
      el.remove()
    } catch {
      /* ignore */
    }
  }, duration_ms)
}
