import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "dist",
    "build",
    "node_modules",
    "*.min.js",
    "coverage",
    ".next",
    "out",
    "public",
  ]),
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importPlugin,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          project: "./tsconfig.eslint.json",
        },
        node: true,
      },
    },
    rules: {
      // Base Plugin Rules (Bundled)
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // Code Quality & Readability
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
      "max-nested-callbacks": ["warn", 3],
      complexity: ["warn", 15],
      "max-params": ["warn", 4],
      "max-depth": ["warn", 4],

      // TypeScript
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: { regex: "^I[A-Z]", match: false },
        },
        { selector: "typeAlias", format: ["PascalCase"] },
        { selector: "enum", format: ["PascalCase"] },
      ],
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
          allowAny: false,
          allowNullish: false,
        },
      ],

      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-multi-comp": ["warn", { ignoreStateless: true }],
      "react/self-closing-comp": ["warn", { component: true, html: true }],
      "react/jsx-boolean-value": ["warn", "never"],
      "react/jsx-fragments": ["warn", "syntax"],
      "react/jsx-curly-spacing": ["warn", "never"],
      "react/jsx-sort-props": "off",
      "react/no-danger": "warn",
      "react/no-array-index-key": "warn",
      "react/jsx-no-leaked-render": "off",
      "react/jsx-no-useless-fragment": "off",

      // React Refresh
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Import
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "object",
            "type",
          ],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "@/**", group: "internal" },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",
      "import/prefer-default-export": "off",
      "import/no-default-export": "off",

      // Accessibility
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",

      // General JavaScript/TypeScript
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "warn",
      // Form stack is locked to antd Form + Form.useForm + zodFieldRule
      // (REVIEW.md §3.7). React Hook Form and its resolvers (incl. zodResolver
      // from @hookform/resolvers/zod) were removed — reintroducing them is a
      // blocker, so fail the build instead of relying on review to catch it.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-hook-form",
              message:
                "RHF was removed. Use antd Form + Form.useForm + zodFieldRule instead (REVIEW.md §3.7).",
            },
          ],
          patterns: [
            {
              group: ["@hookform/*"],
              message:
                "zodResolver/@hookform was removed. Bridge the Zod schema via zodFieldRule instead (REVIEW.md §3.7).",
            },
          ],
        },
      ],
      "no-var": "error",
      "prefer-const": "warn",
      "prefer-arrow-callback": "warn",
      "prefer-template": "warn",
      "object-shorthand": ["warn", "always"],
      semi: ["error", "always"],
      quotes: ["warn", "single", { avoidEscape: true }],
      "comma-dangle": ["warn", "always-multiline"],
      eqeqeq: ["error", "always"],
      "no-nested-ternary": "warn",
      "no-else-return": "warn",
      curly: ["warn", "all"],
      yoda: "error",
      "no-return-await": "error",
      "no-promise-executor-return": "error",
      "require-await": "warn",
      camelcase: [
        "warn",
        { properties: "never", ignoreDestructuring: true, allow: ["Geist_Mono", "Albert_Sans"] },
      ],
    },
  },
  // Overrides
  {
    files: ["*.config.js", "*.config.ts", "*.config.mjs"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "import/no-default-export": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
  {
    files: ["**/layout.tsx", "**/page.tsx", "**/loading.tsx", "**/error.tsx", "**/not-found.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
      "import/no-default-export": "off",
    },
  },
  {
    files: ["**/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["**/components/**/*.tsx", "**/pages/**/*.tsx", "**/app/**/*.tsx"],
    rules: {
      "max-lines-per-function": ["warn", { max: 150, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", 20],
    },
  },
  {
    files: ["**/context/**/*.tsx", "**/contexts/**/*.tsx"],
    rules: {
      "max-lines-per-function": "off",
      complexity: ["warn", 25],
    },
  },
  {
    files: ["**/hooks/**/*.ts", "**/hooks/**/*.tsx"],
    rules: {
      "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "max-lines": "off",
    },
  },
  {
    files: ["**/api/**/*.ts", "**/services/**/*.ts"],
    rules: {
      "max-lines-per-function": ["warn", { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
  eslintConfigPrettier,
]);
