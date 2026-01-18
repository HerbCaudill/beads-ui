/**
 * Toast component for displaying transient notifications.
 *
 * Renders toast messages that auto-dismiss after a configurable duration.
 * Supports multiple stacked toasts and different visual variants.
 */
import { useToastStore, type Toast as ToastType, type ToastVariant } from "../store/toast-store.js"

/**
 * Get the background color for a toast variant.
 *
 * @param variant - The toast variant.
 * @returns CSS background color string.
 */
function getBackgroundColor(variant: ToastVariant): string {
  switch (variant) {
    case "success":
      return "#156d36"
    case "error":
      return "#9f2011"
    default:
      return "rgba(0,0,0,0.85)"
  }
}

/** Props for a single toast item. */
interface ToastItemProps {
  /** The toast data. */
  toast: ToastType
  /** Index in the stack (for positioning). */
  index: number
  /** Optional test ID prefix. */
  testId?: string | undefined
}

/**
 * Single toast item component.
 *
 * @param props - Component props.
 */
function ToastItem({ toast, index, testId }: ToastItemProps): React.JSX.Element {
  const baseTestId = testId ? `${testId}-item-${index}` : undefined

  return (
    <div
      className="toast"
      data-testid={baseTestId}
      data-variant={toast.variant}
      style={{
        position: "fixed",
        right: "12px",
        bottom: `${12 + index * 44}px`,
        zIndex: 1000,
        color: "#fff",
        padding: "8px 10px",
        borderRadius: "4px",
        fontSize: "12px",
        background: getBackgroundColor(toast.variant),
      }}
    >
      {toast.text}
    </div>
  )
}

/** Props for the ToastContainer component. */
export interface ToastContainerProps {
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * Container component that renders all active toasts.
 *
 * Toasts are stacked from bottom to top, with the most recent at the bottom.
 *
 * @param props - Component props.
 */
export function ToastContainer({ testId }: ToastContainerProps): React.JSX.Element | null {
  const toasts = useToastStore(state => state.toasts)

  if (toasts.length === 0) {
    return null
  }

  return (
    <div data-testid={testId} aria-live="polite" aria-atomic="true">
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} index={index} testId={testId} />
      ))}
    </div>
  )
}
