import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { afterEach, describe, expect, test } from "vitest"

import { createBeadsMcpServer } from "../create-beads-mcp-server.js"
import type { Issue } from "@beads/sdk"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

describe("createBeadsMcpServer", () => {
  const clients: Client[] = []
  const servers: McpServer[] = []

  afterEach(async () => {
    await Promise.all(clients.map((client) => client.close()))
    await Promise.all(servers.map((server) => server.close()))
  })

  test("advertises a readable inline view for the issue list", async () => {
    const server = createBeadsMcpServer({
      getIssue: async () => issue,
      listIssues: async () => [issue],
      viewHtml: "<html>Beads task list</html>",
      workspace: "/work/acme",
    })
    const client = new Client({ name: "test-client", version: "1.0.0" })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    clients.push(client)
    servers.push(server)

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    const { tools } = await client.listTools()
    const listTool = tools.find((tool) => tool.name === "list_issues")
    expect(listTool?._meta).toMatchObject({
      ui: { resourceUri: "ui://beads/issues.html" },
    })
    expect(listTool?.annotations).toMatchObject({
      destructiveHint: false,
      readOnlyHint: true,
    })

    const resource = await client.readResource({ uri: "ui://beads/issues.html" })
    expect(resource.contents).toEqual([
      expect.objectContaining({
        mimeType: "text/html;profile=mcp-app",
        text: "<html>Beads task list</html>",
        uri: "ui://beads/issues.html",
      }),
    ])
  })

  test("returns active issues as structured content with a text fallback", async () => {
    const server = createBeadsMcpServer({
      getIssue: async () => issue,
      listIssues: async () => [closedIssue, issue],
      viewHtml: "<html></html>",
      workspace: "/work/acme",
    })
    const client = new Client({ name: "test-client", version: "1.0.0" })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    clients.push(client)
    servers.push(server)

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    const result = await client.callTool({ name: "list_issues", arguments: {} })
    expect(result.structuredContent).toEqual({
      includeClosed: false,
      issues: [issue],
      workspace: "/work/acme",
    })
    expect(result.content).toEqual([
      {
        type: "text",
        text: "1 active Beads issue in /work/acme\n\n[P1] bd-123 · in progress · Add MCP support",
      },
    ])
  })

  test("includes closed issues when requested", async () => {
    const server = createBeadsMcpServer({
      getIssue: async () => issue,
      listIssues: async () => [closedIssue, issue],
      viewHtml: "<html></html>",
      workspace: "/work/acme",
    })
    const client = new Client({ name: "test-client", version: "1.0.0" })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    clients.push(client)
    servers.push(server)

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    const result = await client.callTool({
      name: "list_issues",
      arguments: { includeClosed: true },
    })
    expect(result.structuredContent).toEqual({
      includeClosed: true,
      issues: [closedIssue, issue],
      workspace: "/work/acme",
    })
  })

  test("returns the requested issue details", async () => {
    const server = createBeadsMcpServer({
      getIssue: async (id) => ({ ...issue, id }),
      listIssues: async () => [],
      viewHtml: "<html></html>",
      workspace: "/work/acme",
    })
    const client = new Client({ name: "test-client", version: "1.0.0" })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    clients.push(client)
    servers.push(server)

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

    const { tools } = await client.listTools()
    expect(tools.find((tool) => tool.name === "get_issue")?._meta).toMatchObject({
      ui: { resourceUri: "ui://beads/issues.html" },
    })

    const result = await client.callTool({
      name: "get_issue",
      arguments: { id: "bd-456" },
    })
    expect(result.structuredContent).toEqual({
      issue: { ...issue, id: "bd-456" },
      workspace: "/work/acme",
    })
  })
})

const issue = {
  commentCount: 2,
  createdAt: "2026-08-03T08:00:00.000Z",
  dependencyCount: 0,
  dependentCount: 1,
  description: "Expose task data to agents.",
  id: "bd-123",
  labels: ["mcp"],
  priority: 1,
  status: "in_progress",
  title: "Add MCP support",
  type: "feature",
  updatedAt: "2026-08-03T09:00:00.000Z",
} satisfies Issue

const closedIssue = {
  ...issue,
  closedAt: "2026-08-03T10:00:00.000Z",
  id: "bd-100",
  status: "closed",
  title: "Research MCP Apps",
} satisfies Issue
