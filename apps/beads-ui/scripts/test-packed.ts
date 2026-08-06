import assert from "node:assert/strict"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { spawn, execFileSync } from "node:child_process"
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** Pack, install, launch, and probe the public package from a clean directory. */
async function testPacked(): Promise<void> {
  const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "beads-pack-"))
  const consumerDirectory = resolve(temporaryDirectory, "consumer")
  const workspaceDirectory = resolve(temporaryDirectory, "workspace")
  const fixtureBin = resolve(packageDirectory, "e2e/fixtures/bin")
  const statePath = resolve(temporaryDirectory, "state.json")
  let child: ReturnType<typeof spawn> | undefined

  try {
    await mkdir(consumerDirectory)
    await mkdir(resolve(workspaceDirectory, ".beads"), { recursive: true })
    await writeFile(
      statePath,
      JSON.stringify({
        issues: [
          {
            comments: [],
            created_at: "2026-07-15T10:00:00Z",
            dependencies: [],
            id: "bd-test.1",
            issue_type: "task",
            labels: [],
            priority: 2,
            status: "open",
            title: "Packed smoke task",
            updated_at: "2026-07-15T10:00:00Z",
          },
        ],
      }),
    )
    const packOutput = execFileSync(
      "npm",
      ["pack", "--json", "--pack-destination", temporaryDirectory],
      { cwd: packageDirectory, encoding: "utf8" },
    )
    const packResult = JSON.parse(packOutput) as [{ readonly filename: string }]
    const tarball = resolve(temporaryDirectory, packResult[0].filename)

    execFileSync("npm", ["install", "--ignore-scripts", tarball], {
      cwd: consumerDirectory,
      stdio: "pipe",
    })
    child = spawn(
      resolve(consumerDirectory, "node_modules/.bin/beads-ui"),
      ["--no-open", "--port", "4174"],
      {
        cwd: workspaceDirectory,
        env: {
          ...process.env,
          BEADS_TEST_STATE: statePath,
          PATH: `${fixtureBin}:${process.env.PATH ?? ""}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
    await new Promise<void>((resolveReady, reject) => {
      let output = ""
      const timeout = setTimeout(
        () => reject(new Error(`Packed CLI did not become ready:\n${output}`)),
        10_000,
      )
      child?.once("exit", (code) => {
        clearTimeout(timeout)
        reject(new Error(`Packed CLI exited with code ${code}:\n${output}`))
      })
      child?.stderr?.on("data", (data) => {
        output += String(data)
      })
      child?.stdout?.on("data", (data) => {
        output += String(data)
        if (output.includes("Beads UI:")) {
          clearTimeout(timeout)
          resolveReady()
        }
      })
    })

    const workspaceResponse = await fetch("http://127.0.0.1:4174/api/workspace")
    const applicationResponse = await fetch("http://127.0.0.1:4174/")
    assert.equal(workspaceResponse.status, 200)
    assert.equal(applicationResponse.status, 200)
    assert.match(await applicationResponse.text(), /<div id="root"><\/div>/)

    const mcpTransport = new StdioClientTransport({
      args: ["mcp"],
      command: resolve(consumerDirectory, "node_modules/.bin/beads-ui"),
      cwd: workspaceDirectory,
      env: {
        BEADS_TEST_STATE: statePath,
        PATH: `${fixtureBin}:${process.env.PATH ?? ""}`,
      },
      stderr: "pipe",
    })
    const mcpClient = new Client({ name: "packed-test", version: "1.0.0" })
    try {
      await mcpClient.connect(mcpTransport)
      const tools = await mcpClient.listTools()
      assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), ["get_issue", "list_issues"])
      assert.deepEqual(tools.tools.find((tool) => tool.name === "get_issue")?._meta, {
        "ui/resourceUri": "ui://beads/issues.html",
        ui: {
          resourceUri: "ui://beads/issues.html",
          visibility: ["model", "app"],
        },
      })
      const issueList = await mcpClient.callTool({ name: "list_issues", arguments: {} })
      const canonicalWorkspace = await realpath(workspaceDirectory)
      assert.deepEqual(issueList.structuredContent, {
        includeClosed: false,
        issues: [
          {
            commentCount: 0,
            createdAt: "2026-07-15T10:00:00Z",
            dependencyCount: 0,
            dependentCount: 0,
            id: "bd-test.1",
            isReady: true,
            labels: [],
            priority: 2,
            status: "open",
            title: "Packed smoke task",
            type: "task",
            updatedAt: "2026-07-15T10:00:00Z",
          },
        ],
        workspace: canonicalWorkspace,
      })
      const issueDetail = await mcpClient.callTool({
        name: "get_issue",
        arguments: { id: "bd-test.1" },
      })
      assert.deepEqual(issueDetail.structuredContent, {
        issue: {
          commentCount: 0,
          comments: [],
          createdAt: "2026-07-15T10:00:00Z",
          dependencies: [],
          dependencyCount: 0,
          dependentCount: 0,
          dependents: [],
          id: "bd-test.1",
          labels: [],
          priority: 2,
          status: "open",
          title: "Packed smoke task",
          type: "task",
          updatedAt: "2026-07-15T10:00:00Z",
        },
        workspace: canonicalWorkspace,
      })
      const resource = await mcpClient.readResource({ uri: "ui://beads/issues.html" })
      const view = resource.contents[0]
      assert.ok(view && "text" in view)
      assert.equal(view.mimeType, "text/html;profile=mcp-app")
      assert.match(view.text, /Beads issue list/)
      assert.doesNotMatch(
        view.text,
        /MCP widget preview|preview-page|Teach the task list to make espresso/,
      )
    } finally {
      await mcpClient.close()
    }
  } finally {
    child?.kill("SIGINT")
    await rm(temporaryDirectory, { force: true, recursive: true })
  }
}

await testPacked()
