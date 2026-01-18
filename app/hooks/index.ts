/**
 * React hooks index file.
 *
 * Re-exports setter functions and hooks for React components to access
 * shared data layers initialized in main-lit.ts.
 */

// Issue stores
export {
  setIssueStoresInstance,
  clearIssueStoresInstance,
  getIssueStoresInstance,
  useIssueStore,
  useIssue,
  useIssueStoresAvailable,
  useIssueStoreLite,
} from "./use-issue-stores.js"

// List selectors
export {
  setListSelectorsInstance,
  clearListSelectorsInstance,
  getListSelectorsInstance,
  useIssuesFor,
  useBoardColumn,
  useEpicChildren,
  useListSelectorsAvailable,
} from "./useListSelectors.js"

// Transport
export {
  setTransportInstance,
  clearTransportInstance,
  getTransportInstance,
  useTransport,
  useTransportAvailable,
  type TransportFn,
} from "./use-transport.js"

// Subscriptions
export {
  setSubscriptionsInstance,
  clearSubscriptionsInstance,
  getSubscriptionsInstance,
  setIssueStoresRegistryInstance,
  clearIssueStoresRegistryInstance,
  getIssueStoresRegistryInstance,
  useSubscription,
  useSubscriptionsAvailable,
} from "./use-subscriptions.js"

// List data
export { useListData, useFilterActions, type ListData, type FilterActions } from "./useListData.js"

// Workspace actions
export {
  setWorkspaceChangeHandler,
  clearWorkspaceChangeHandler,
  getWorkspaceChangeHandler,
  useWorkspaceChange,
  useWorkspaceChangeAvailable,
  type WorkspaceChangeFn,
} from "./use-workspace-actions.js"

// Fatal error dialog
export {
  showFatalError,
  dismissFatalError,
  getFatalErrorState,
  clearFatalErrorState,
  useFatalError,
  useFatalErrorActions,
  type FatalErrorState,
} from "./use-fatal-error.js"
