/**
 * EpicsView component.
 *
 * Displays a list of epics with expandable children. Each epic can be expanded
 * to show its child issues in a table format.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { IssueLite, DependencyRef } from "../../types/issues.js"
import { useIssueStoreLite, useSubscription, useTransport } from "../hooks/index.js"
import { EpicGroup, type EpicEntity } from "./EpicGroup.js"
import type { IssueUpdatePatch } from "./IssueRow.js"

/**
 * Extended epic entity with dependents list.
 */
interface EpicWithDependents extends IssueLite {
  dependents?: DependencyRef[]
  total_children?: number
  closed_children?: number
}

/**
 * Epic group data with computed children counts.
 */
interface EpicGroupData {
  epic: EpicEntity
  total_children: number
  closed_children: number
}

export interface EpicsViewProps {
  /** Handler for navigating to an issue. */
  onNavigate: (id: string) => void
}

/**
 * Build epic groups from the epics snapshot.
 *
 * @param epics - The epics from the store.
 */
function buildGroupsFromEpics(epics: readonly IssueLite[]): EpicGroupData[] {
  const groups: EpicGroupData[] = []

  for (const epic of epics) {
    const epic_with_deps = epic as EpicWithDependents
    const dependents = Array.isArray(epic_with_deps.dependents) ? epic_with_deps.dependents : []

    // Prefer explicit counters when provided by server; otherwise derive
    const has_total = Number.isFinite(epic_with_deps.total_children)
    const has_closed = Number.isFinite(epic_with_deps.closed_children)
    const total = has_total ? Number(epic_with_deps.total_children) || 0 : dependents.length
    let closed = has_closed ? Number(epic_with_deps.closed_children) || 0 : 0

    if (!has_closed) {
      for (const d of dependents) {
        if (String(d.status || "") === "closed") {
          closed++
        }
      }
    }

    // Convert to EpicEntity for the component
    const epic_entity: EpicEntity = {
      ...epic,
      total_children: total,
      closed_children: closed,
    }

    groups.push({
      epic: epic_entity,
      total_children: total,
      closed_children: closed,
    })
  }

  return groups
}

/**
 * Epics view component.
 *
 * Displays epics from the `tab:epics` subscription with expandable children.
 *
 * @param props - Component props.
 */
export function EpicsView({ onNavigate }: EpicsViewProps): React.JSX.Element {
  // Get epics from the store
  const epics = useIssueStoreLite("tab:epics")

  // Track expanded and loading state
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<Set<string>>(new Set())

  // Track which epics have active subscriptions
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set())

  // Transport for mutations
  const transport = useTransport()

  // Build groups from epics
  const groups = useMemo(() => buildGroupsFromEpics(epics), [epics])

  // Track if we've auto-expanded the first epic
  const auto_expanded_ref = useRef(false)

  // Auto-expand the first epic when groups become available
  useEffect(() => {
    if (groups.length > 0 && !auto_expanded_ref.current) {
      const first_id = groups[0]?.epic?.id
      if (first_id && !expanded.has(first_id)) {
        auto_expanded_ref.current = true
        handleToggle(first_id)
      }
    }
  }, [groups.length])

  /**
   * Handle toggling expansion of an epic.
   *
   * @param epic_id - The ID of the epic to toggle.
   */
  const handleToggle = useCallback((epic_id: string): void => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(epic_id)) {
        // Collapse: remove from expanded and subscribed
        next.delete(epic_id)
        setSubscribed(s => {
          const ns = new Set(s)
          ns.delete(epic_id)
          return ns
        })
      } else {
        // Expand: add to expanded, loading, and subscribed
        next.add(epic_id)
        setLoading(l => {
          const nl = new Set(l)
          nl.add(epic_id)
          return nl
        })
        setSubscribed(s => {
          const ns = new Set(s)
          ns.add(epic_id)
          return ns
        })
        // Remove loading state after a short delay (subscription will push data)
        setTimeout(() => {
          setLoading(l => {
            const nl = new Set(l)
            nl.delete(epic_id)
            return nl
          })
        }, 100)
      }
      return next
    })
  }, [])

  /**
   * Handle updating an issue.
   *
   * Uses the same field-specific mutations as createDataLayer.
   *
   * @param id - The issue ID.
   * @param patch - The update patch.
   */
  const handleUpdate = useCallback(
    async (id: string, patch: IssueUpdatePatch): Promise<void> => {
      try {
        if (typeof patch.title === "string") {
          await transport("edit-text", { id, field: "title", value: patch.title })
        }
        if (typeof patch.assignee === "string") {
          await transport("update-assignee", { id, assignee: patch.assignee })
        }
        if (typeof patch.status === "string") {
          await transport("update-status", { id, status: patch.status })
        }
        if (typeof patch.priority === "number") {
          await transport("update-priority", { id, priority: patch.priority })
        }
      } catch {
        // swallow errors; UI will update on next push
      }
    },
    [transport],
  )

  // Render subscriptions for expanded epics
  const subscription_elements = useMemo(() => {
    return Array.from(subscribed).map(epic_id => (
      <EpicSubscription key={epic_id} epic_id={epic_id} />
    ))
  }, [subscribed])

  if (groups.length === 0) {
    return <div className="panel__header muted">No epics found.</div>
  }

  return (
    <>
      {/* Hidden subscription elements */}
      {subscription_elements}

      {/* Epic groups */}
      {groups.map(g => (
        <EpicGroup
          key={g.epic.id}
          epic={g.epic}
          total_children={g.total_children}
          closed_children={g.closed_children}
          expanded={expanded.has(g.epic.id)}
          loading={loading.has(g.epic.id)}
          onToggle={handleToggle}
          onNavigate={onNavigate}
          onUpdate={handleUpdate}
        />
      ))}
    </>
  )
}

/**
 * Hidden component that manages a subscription for an epic.
 */
function EpicSubscription({ epic_id }: { epic_id: string }): null {
  const client_id = `detail:${epic_id}`
  const spec = useMemo(
    () => ({
      type: "issue-detail" as const,
      params: { id: epic_id },
    }),
    [epic_id],
  )

  useSubscription(client_id, spec, true)

  return null
}
