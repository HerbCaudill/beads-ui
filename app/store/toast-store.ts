/**
 * Zustand store for toast notifications.
 *
 * Manages toast messages with auto-dismiss functionality.
 */
import { create } from "zustand"

/** Toast visual variant. */
export type ToastVariant = "info" | "success" | "error"

/** A single toast notification. */
export interface Toast {
  /** Unique identifier for this toast. */
  id: string
  /** Message text. */
  text: string
  /** Visual variant. */
  variant: ToastVariant
  /** Auto-dismiss delay in milliseconds. */
  duration_ms: number
}

/** Toast store state. */
interface ToastState {
  /** Active toasts. */
  toasts: Toast[]
}

/** Toast store actions. */
interface ToastActions {
  /** Add a new toast. */
  addToast: (text: string, variant?: ToastVariant, duration_ms?: number) => void
  /** Remove a toast by ID. */
  removeToast: (id: string) => void
  /** Clear all toasts. */
  clearToasts: () => void
}

/** Combined store type. */
type ToastStore = ToastState & ToastActions

/** Counter for generating unique toast IDs. */
let toastIdCounter = 0

/**
 * Generate a unique toast ID.
 *
 * @returns Unique toast ID.
 */
function generateToastId(): string {
  return `toast-${++toastIdCounter}`
}

/**
 * Toast store for managing notifications.
 */
export const useToastStore = create<ToastStore>(set => ({
  toasts: [],

  addToast: (text, variant = "info", duration_ms = 2800) => {
    const id = generateToastId()
    const toast: Toast = { id, text, variant, duration_ms }

    set(state => ({
      toasts: [...state.toasts, toast],
    }))

    // Auto-dismiss after duration
    setTimeout(() => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id),
      }))
    }, duration_ms)
  },

  removeToast: id =>
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),
}))

/**
 * Show a transient global toast message.
 *
 * This is a convenience function that can be called from anywhere.
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
  useToastStore.getState().addToast(text, variant, duration_ms)
}
