/**
 * React hook for ListView data.
 *
 * Combines list selectors with Zustand filter state to provide
 * filtered and sorted issue data for the ListView component.
 */
import { useMemo } from "react"

import type { IssueLite } from "../../types/issues.js"
import { cmpClosedDesc } from "../data/sort.js"
import { useAppStore, type Filters, type StatusFilter } from "../store/index.js"
import { useIssuesFor } from "./useListSelectors.js"

/**
 * Return type for useListData hook.
 */
export interface ListData {
  /** Filtered and sorted issues */
  issues: readonly IssueLite[]
  /** Current filter state */
  filters: Filters
  /** Whether any filters are active */
  hasActiveFilters: boolean
  /** Total count before filtering */
  totalCount: number
  /** Count after filtering */
  filteredCount: number
}

/**
 * Filter actions for updating filter state.
 */
export interface FilterActions {
  /** Set status filter */
  setStatusFilter: (status: StatusFilter) => void
  /** Set type filter */
  setTypeFilter: (type: string) => void
  /** Set search text */
  setSearchText: (search: string) => void
  /** Clear all filters */
  clearFilters: () => void
  /** Toggle status in multi-select mode */
  toggleStatus: (status: StatusFilter) => void
}

/**
 * Extended issue type for list view with optional labels.
 */
interface ListIssue extends IssueLite {
  labels?: string[]
}

/**
 * Normalize status filter value to array format for multi-select support.
 * The store uses single StatusFilter, but UI may use array for multi-select.
 */
function normalizeStatusFilter(val: StatusFilter | string[] | undefined): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val !== "all") return [val]
  return []
}

/**
 * Normalize type filter value to array format.
 */
function normalizeTypeFilter(val: string | string[] | undefined): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val !== "") return [val]
  return []
}

/**
 * Hook to get filtered and sorted issues for the list view.
 *
 * Subscribes to:
 * - List selectors for raw issue data (via useIssuesFor)
 * - Zustand store for filter state
 *
 * Returns filtered/sorted issues plus filter metadata.
 *
 * @param clientId - Subscription client ID (default: "tab:issues")
 * @returns ListData with filtered issues and metadata
 */
export function useListData(clientId = "tab:issues"): ListData {
  // Get raw issues from list selectors
  const rawIssues = useIssuesFor(clientId)

  // Get filter state from Zustand store
  const filters = useAppStore(state => state.filters)

  // Filter and sort issues
  const { issues, hasActiveFilters } = useMemo(() => {
    let filtered = rawIssues as ListIssue[]
    const statusFilters = normalizeStatusFilter(filters.status)
    const typeFilters = normalizeTypeFilter(filters.type)
    const searchText = filters.search || ""

    // Apply status filter
    // Note: "ready" is a special UI state not stored in issue.status,
    // so we skip status filtering if "ready" is the only filter
    if (statusFilters.length > 0 && !statusFilters.includes("ready")) {
      filtered = filtered.filter(it => statusFilters.includes(String(it.status || "")))
    }

    // Apply search filter (matches id or title)
    if (searchText) {
      const needle = searchText.toLowerCase()
      filtered = filtered.filter(it => {
        const idMatch = String(it.id).toLowerCase().includes(needle)
        const titleMatch = String(it.title || "")
          .toLowerCase()
          .includes(needle)
        return idMatch || titleMatch
      })
    }

    // Apply type filter
    if (typeFilters.length > 0) {
      filtered = filtered.filter(it => typeFilters.includes(String(it.issue_type || "")))
    }

    // Apply special sorting for closed filter
    // When viewing only closed issues, sort by closed_at desc
    if (statusFilters.length === 1 && statusFilters[0] === "closed") {
      filtered = filtered.slice().sort(cmpClosedDesc)
    }

    const hasActive = statusFilters.length > 0 || typeFilters.length > 0 || searchText.length > 0

    return { issues: filtered, hasActiveFilters: hasActive }
  }, [rawIssues, filters.status, filters.type, filters.search])

  return {
    issues,
    filters,
    hasActiveFilters,
    totalCount: rawIssues.length,
    filteredCount: issues.length,
  }
}

/**
 * Hook to get filter actions for updating filter state.
 *
 * Provides convenient methods for modifying filters in the Zustand store.
 *
 * @returns FilterActions object with setter methods
 */
export function useFilterActions(): FilterActions {
  const setFilters = useAppStore(state => state.setFilters)

  return useMemo(
    () => ({
      setStatusFilter: (status: StatusFilter) => {
        setFilters({ status })
      },
      setTypeFilter: (type: string) => {
        setFilters({ type })
      },
      setSearchText: (search: string) => {
        setFilters({ search })
      },
      clearFilters: () => {
        setFilters({ status: "all", type: "", search: "" })
      },
      toggleStatus: (status: StatusFilter) => {
        // For multi-select toggle behavior, get current and toggle
        const current = useAppStore.getState().filters.status
        if (current === status) {
          setFilters({ status: "all" })
        } else {
          setFilters({ status })
        }
      },
    }),
    [setFilters],
  )
}
