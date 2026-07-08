import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore build artifacts / dependencies anywhere in the tree, not just at
    // the root — the `public/Downloads` dump contains nested .next + node_modules.
    "**/.next/**",
    "**/node_modules/**",
    // Downloaded sample projects accidentally committed under public/. Not our
    // source — should ideally be removed from the repo entirely (see note).
    "public/Downloads/**",
  ]),
  // Pre-existing violations across the codebase. Downgraded from error -> warn
  // so CI isn't blocked on day one; they stay visible and should be cleaned up
  // over time, then promoted back to "error".
  {
    rules: {
      "react/no-unescaped-entities": "warn",
      "react/jsx-no-comment-textnodes": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
