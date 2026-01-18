/**
 * Vitest setup for React testing with jsdom environment
 *
 * @testing-library/react automatic cleanup requires either `globals: true`
 * in vitest config, or explicit cleanup in a setup file. Since we don't
 * use globals, we import cleanup and call it in afterEach.
 */
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Clean up after each test to prevent DOM leakage between tests
afterEach(() => {
  cleanup()
})
