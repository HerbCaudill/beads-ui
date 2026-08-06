import type { BeadsResult, IssueResult, LoadIssue, PreviewScenario } from "./types.js"

/** Active issues covering the widget's supported metadata and status groups. */
const activeIssues = [
  {
    assignee: "herb",
    commentCount: 3,
    createdAt: "2026-08-01T08:00:00.000Z",
    dependencyCount: 0,
    dependentCount: 2,
    description: "Expose a fast local preview for the inline task list.",
    id: "bd-123",
    labels: ["mcp", "developer-experience"],
    owner: "herb@devresults.com",
    priority: 1,
    startedAt: "2026-08-03T09:00:00.000Z",
    status: "in_progress",
    title: "Add hot-reloading MCP widget preview",
    type: "task",
    updatedAt: "2026-08-03T10:00:00.000Z",
  },
  {
    commentCount: 0,
    createdAt: "2026-08-01T08:00:00.000Z",
    dependencyCount: 0,
    dependentCount: 0,
    description: "Verify how a long title truncates inside a narrow host container.",
    id: "bd-124",
    labels: ["design"],
    priority: 2,
    status: "open",
    title: "Polish an intentionally long issue title for narrow inline conversations",
    type: "task",
    updatedAt: "2026-08-03T10:00:00.000Z",
  },
  {
    commentCount: 0,
    createdAt: "2026-08-01T08:00:00.000Z",
    dependencyCount: 0,
    dependentCount: 0,
    id: "bd-125",
    labels: [],
    priority: 4,
    status: "open",
    title: "Teach the task list to make espresso",
    type: "task",
    updatedAt: "2026-08-03T10:00:00.000Z",
  },
  {
    commentCount: 5,
    createdAt: "2026-08-01T08:00:00.000Z",
    dependencyCount: 1,
    dependentCount: 0,
    description: "Wait for the host compatibility question to be resolved.",
    id: "bd-126",
    labels: ["release"],
    priority: 0,
    status: "blocked",
    title: "Publish the inline widget",
    type: "task",
    updatedAt: "2026-08-03T10:00:00.000Z",
  },
  {
    commentCount: 0,
    createdAt: "2026-08-01T08:00:00.000Z",
    dependencyCount: 0,
    dependentCount: 0,
    description: "Revisit after the next protocol revision.",
    id: "bd-127",
    labels: ["research"],
    priority: 3,
    status: "deferred",
    title: "Investigate celebratory task confetti",
    type: "task",
    updatedAt: "2026-08-03T10:00:00.000Z",
  },
] as const

/** Closed issue used by the all-statuses fixture. */
const closedIssue = {
  closedAt: "2026-08-03T10:00:00.000Z",
  commentCount: 2,
  createdAt: "2026-07-31T08:00:00.000Z",
  dependencyCount: 0,
  dependentCount: 0,
  description: "Prove that the MCP host can render the bundled application.",
  id: "bd-122",
  labels: ["mcp"],
  priority: 1,
  status: "closed",
  title: "Spike the MCP Apps host integration",
  type: "task",
  updatedAt: "2026-08-03T10:00:00.000Z",
} as const

/** Representative tool results available in the browser preview. */
export const previewResults = {
  active: {
    includeClosed: false,
    issues: activeIssues,
    workspace: "/work/beads-ui",
  },
  all: {
    includeClosed: true,
    issues: [...activeIssues, closedIssue],
    workspace: "/work/beads-ui",
  },
  single: {
    issue: {
      assignee: "herb",
      commentCount: 1,
      comments: [
        {
          author: "Lynne",
          createdAt: "2026-08-03T11:30:00.000Z",
          id: "comment-1",
          issueId: "bd-128",
          text: "This has enough context now.",
        },
      ],
      createdAt: "2026-08-01T08:00:00.000Z",
      dependencies: [
        {
          dependencyType: "blocks",
          id: "bd-123",
          priority: 1,
          status: "in_progress",
          title: "Add hot-reloading MCP widget preview",
          type: "task",
        },
      ],
      dependencyCount: 1,
      dependentCount: 1,
      dependents: [
        {
          dependencyType: "blocks",
          id: "bd-129",
          priority: 2,
          status: "open",
          title: "Document the single-bead view",
          type: "task",
        },
      ],
      description: "Give one issue enough room for its full context.",
      id: "bd-128",
      labels: ["mcp", "design"],
      owner: "herb@devresults.com",
      parent: "bd-120",
      priority: 1,
      startedAt: "2026-08-03T09:00:00.000Z",
      status: "in_progress",
      title: "Display a single bead inline",
      type: "task",
      updatedAt: "2026-08-03T11:30:00.000Z",
    },
    workspace: "/work/beads-ui",
  },
  empty: {
    includeClosed: false,
    issues: [],
    workspace: "/work/beads-ui",
  },
} satisfies Record<PreviewScenario, BeadsResult>

/** Stand in for the host's `get_issue` tool so the preview can drill into a row. */
export const loadPreviewIssue: LoadIssue = (id) => {
  const issue = [...activeIssues, closedIssue].find((candidate) => candidate.id === id)
  if (!issue) return Promise.reject(new Error(`Beads could not load ${id}.`))

  const result: IssueResult = { issue, workspace: "/work/beads-ui" }
  return Promise.resolve(result)
}
