/**
 * React hook for managing fatal error dialog state.
 *
 * Provides a way to show fatal error dialogs from anywhere in the app.
 * The state is managed via module-level variables that can be set from
 * main-bootstrap.ts and read by React components.
 */
import { useCallback, useSyncExternalStore } from "react"

/**
 * Fatal error state shape.
 */
export interface FatalErrorState {
  /** Whether the error dialog is open. */
  isOpen: boolean
  /** The error title to display. */
  title: string
  /** The error message to display. */
  message: string
  /** Optional detailed error information. */
  detail: string
}

/** Default state when no error is displayed. */
const defaultState: FatalErrorState = {
  isOpen: false,
  title: "",
  message: "",
  detail: "",
}

/** Module-level state for fatal error. */
let errorState: FatalErrorState = { ...defaultState }

/** Subscribers to state changes. */
const subscribers = new Set<() => void>()

/**
 * Notify all subscribers of a state change.
 */
function notifySubscribers(): void {
  for (const subscriber of subscribers) {
    subscriber()
  }
}

/**
 * Open the fatal error dialog with the given error information.
 *
 * @param title - The error title.
 * @param message - The error message.
 * @param detail - Optional detailed error information.
 */
export function showFatalError(title: string, message: string, detail?: string): void {
  errorState = {
    isOpen: true,
    title,
    message,
    detail: detail || "",
  }
  notifySubscribers()
}

/**
 * Close the fatal error dialog.
 */
export function dismissFatalError(): void {
  errorState = { ...defaultState }
  notifySubscribers()
}

/**
 * Get the current fatal error state (for testing or non-React code).
 *
 * @returns The current fatal error state.
 */
export function getFatalErrorState(): FatalErrorState {
  return errorState
}

/**
 * Clear the fatal error state (for testing).
 */
export function clearFatalErrorState(): void {
  errorState = { ...defaultState }
  notifySubscribers()
}

/**
 * Hook to subscribe to fatal error state.
 *
 * @returns The current fatal error state.
 */
export function useFatalError(): FatalErrorState {
  return useSyncExternalStore(
    callback => {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
    () => errorState,
    () => errorState,
  )
}

/**
 * Hook to get fatal error actions.
 *
 * @returns Object with dismiss and reload actions.
 */
export function useFatalErrorActions(): {
  dismiss: () => void
  reload: () => void
} {
  const dismiss = useCallback(() => {
    dismissFatalError()
  }, [])

  const reload = useCallback(() => {
    window.location.reload()
  }, [])

  return { dismiss, reload }
}
