import { defineConfig } from "vitest/config";
import path from "node:path";

// Mirrors the tsconfig path alias "@/*" -> "./*" so tests import the same way app code does.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    // Pure-logic-first: default to the node environment. Component tests that need a DOM
    // can opt in per-file with a `// @vitest-environment jsdom` pragma once jsdom is added.
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", ".claude"],
    passWithNoTests: true,
  },
});
