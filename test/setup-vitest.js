/**
 * Vitest setup for React testing with jsdom environment
 *
 * @testing-library/react automatically calls cleanup() after each test
 * when a global `afterEach` function is available (provided by vitest).
 * No explicit configuration is needed.
 *
 * If additional setup is needed in the future (e.g., custom matchers,
 * global mocks), add them here.
 */
