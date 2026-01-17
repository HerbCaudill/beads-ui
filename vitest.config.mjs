import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include: ["**/*.test.{js,ts}"],
          exclude: ["app/**/*.test.{js,ts}", "node_modules/**"],
          environment: "node",
          restoreMocks: true,
        },
      },
      {
        test: {
          name: "jsdom",
          setupFiles: ["test/setup-vitest.js"],
          include: ["app/**/*.test.{js,ts}"],
          environment: "jsdom",
          restoreMocks: true,
        },
      },
    ],
  },
})
