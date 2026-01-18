/**
 * Tests for the WorkspacePicker React component.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { WorkspacePicker } from "./WorkspacePicker.js"
import { useAppStore } from "../store/index.js"

describe("WorkspacePicker", () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    // Reset store to default state
    useAppStore.setState({
      workspace: {
        current: null,
        available: [],
      },
    })
    mockOnChange.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("returns null when no workspaces available", () => {
      useAppStore.setState({
        workspace: {
          current: null,
          available: [],
        },
      })
      const { container } = render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)
      expect(container.innerHTML).toBe("")
    })

    it("renders single workspace as label", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project", database: "/home/user/project/.beads/db" },
          available: [{ path: "/home/user/project", database: "/home/user/project/.beads/db" }],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} testId="ws-picker" />)

      const picker = screen.getByTestId("ws-picker")
      expect(picker.className).toContain("workspace-picker--single")
      expect(screen.getByText("project")).toBeDefined()
    })

    it("renders dropdown for multiple workspaces", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "/home/user/project1/.beads/db" },
          available: [
            { path: "/home/user/project1", database: "/home/user/project1/.beads/db" },
            { path: "/home/user/project2", database: "/home/user/project2/.beads/db" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} testId="ws-picker" />)

      const select = screen.getByRole("combobox")
      expect(select).toBeDefined()
      expect(select.getAttribute("aria-label")).toBe("Select project workspace")
    })

    it("shows all workspace options in dropdown", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/alpha", database: "" },
          available: [
            { path: "/home/user/alpha", database: "" },
            { path: "/home/user/beta", database: "" },
            { path: "/home/user/gamma", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      const options = screen.getAllByRole("option")
      expect(options).toHaveLength(3)
      expect(options[0]?.textContent).toBe("alpha")
      expect(options[1]?.textContent).toBe("beta")
      expect(options[2]?.textContent).toBe("gamma")
    })

    it("applies testId when provided", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} testId="ws-picker" />)

      expect(screen.getByTestId("ws-picker")).toBeDefined()
      expect(screen.getByTestId("ws-picker-select")).toBeDefined()
    })

    it("shows title with full path on single workspace label", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project", database: "" },
          available: [{ path: "/home/user/project", database: "" }],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      const label = screen.getByText("project")
      expect(label.getAttribute("title")).toBe("/home/user/project")
    })
  })

  describe("project name extraction", () => {
    it("extracts project name from path", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/my-awesome-project", database: "" },
          available: [{ path: "/home/user/my-awesome-project", database: "" }],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)
      expect(screen.getByText("my-awesome-project")).toBeDefined()
    })

    it("handles empty path gracefully", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "", database: "" },
          available: [{ path: "", database: "" }],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)
      expect(screen.getByText("Unknown")).toBeDefined()
    })

    it("handles path with trailing slash", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project/", database: "" },
          available: [{ path: "/home/user/project/", database: "" }],
        },
      })
      // Note: the filter(Boolean) in the implementation handles trailing slashes
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)
      expect(screen.getByText("project")).toBeDefined()
    })
  })

  describe("workspace switching", () => {
    it("calls onWorkspaceChange when different workspace selected", async () => {
      mockOnChange.mockResolvedValue(undefined)
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      const select = screen.getByRole("combobox")
      fireEvent.change(select, { target: { value: "/home/user/project2" } })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith("/home/user/project2")
      })
    })

    it("does not call onWorkspaceChange when same workspace selected", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      const select = screen.getByRole("combobox")
      fireEvent.change(select, { target: { value: "/home/user/project1" } })

      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it("disables select while switching", async () => {
      // Create a promise that we can control
      let resolveSwitch: () => void
      const switchPromise = new Promise<void>(resolve => {
        resolveSwitch = resolve
      })
      mockOnChange.mockReturnValue(switchPromise)

      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} testId="ws-picker" />)

      const select = screen.getByRole("combobox") as HTMLSelectElement
      expect(select.disabled).toBe(false)

      // Trigger the switch
      fireEvent.change(select, { target: { value: "/home/user/project2" } })

      // Select should be disabled while switching
      await waitFor(() => {
        expect(select.disabled).toBe(true)
      })

      // Resolve the switch
      resolveSwitch!()

      // Select should be enabled again
      await waitFor(() => {
        expect(select.disabled).toBe(false)
      })
    })

    it("shows loading indicator while switching", async () => {
      let resolveSwitch: () => void
      const switchPromise = new Promise<void>(resolve => {
        resolveSwitch = resolve
      })
      mockOnChange.mockReturnValue(switchPromise)

      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} testId="ws-picker" />)

      // No loading indicator initially
      expect(screen.queryByTestId("ws-picker-loading")).toBeNull()

      // Trigger the switch
      const select = screen.getByRole("combobox")
      fireEvent.change(select, { target: { value: "/home/user/project2" } })

      // Loading indicator should appear
      await waitFor(() => {
        expect(screen.getByTestId("ws-picker-loading")).toBeDefined()
      })

      // Resolve the switch
      resolveSwitch!()

      // Loading indicator should disappear
      await waitFor(() => {
        expect(screen.queryByTestId("ws-picker-loading")).toBeNull()
      })
    })

    it("re-enables select even if switch fails", async () => {
      mockOnChange.mockRejectedValue(new Error("Network error"))

      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      const select = screen.getByRole("combobox") as HTMLSelectElement
      fireEvent.change(select, { target: { value: "/home/user/project2" } })

      // Wait for the promise to reject and state to update
      await waitFor(() => {
        expect(select.disabled).toBe(false)
      })
    })
  })

  describe("current selection", () => {
    it("shows current workspace as selected", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project2", database: "" },
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
            { path: "/home/user/project3", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      const select = screen.getByRole("combobox") as HTMLSelectElement
      expect(select.value).toBe("/home/user/project2")
    })

    it("handles null current workspace", () => {
      useAppStore.setState({
        workspace: {
          current: null,
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
          ],
        },
      })
      render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      const select = screen.getByRole("combobox") as HTMLSelectElement
      // When current is null, value will be empty string, so first option is selected
      expect(select.value).toBe("/home/user/project1")
    })
  })

  describe("reactivity", () => {
    it("updates when workspace state changes", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [{ path: "/home/user/project1", database: "" }],
        },
      })
      const { rerender } = render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)
      expect(screen.getByText("project1")).toBeDefined()

      // Update store to different workspace
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project2", database: "" },
          available: [{ path: "/home/user/project2", database: "" }],
        },
      })
      rerender(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      expect(screen.getByText("project2")).toBeDefined()
    })

    it("transitions from single to multiple workspaces", () => {
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [{ path: "/home/user/project1", database: "" }],
        },
      })
      const { rerender, container } = render(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      // Initially single workspace (label)
      expect(container.querySelector(".workspace-picker--single")).toBeDefined()
      expect(screen.queryByRole("combobox")).toBeNull()

      // Add another workspace
      useAppStore.setState({
        workspace: {
          current: { path: "/home/user/project1", database: "" },
          available: [
            { path: "/home/user/project1", database: "" },
            { path: "/home/user/project2", database: "" },
          ],
        },
      })
      rerender(<WorkspacePicker onWorkspaceChange={mockOnChange} />)

      // Now shows dropdown
      expect(screen.getByRole("combobox")).toBeDefined()
    })
  })
})
