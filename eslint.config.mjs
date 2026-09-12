import js from "@eslint/js";
import globals from "globals";
import html from "eslint-plugin-html";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".claude/**",
      "feature-planning-workflow.md",
      "node_modules/**",
      "*.pdf",
      "dist/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
      sourceType: "module",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "error",
      "no-unused-vars": "error",
    },
  },
  {
    files: ["**/*.html"],
    plugins: { html },
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      sourceType: "module",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "error",
      "no-unused-vars": "error",
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
