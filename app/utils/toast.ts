/**
 * Toast utility re-exports.
 *
 * This module re-exports the toast API from the store for backwards compatibility.
 * The actual implementation now uses React and Zustand for state management.
 */
export { showToast, type ToastVariant } from "../store/toast-store.js"
