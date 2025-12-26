import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach } from "vitest";

// Make React available globally for JSX transforms
globalThis.React = React;

// Cleanup after each test to prevent DOM pollution
afterEach(() => {
  cleanup();
});
