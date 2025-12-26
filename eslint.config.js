// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-prototype-builtins": "off",
      "no-case-declarations": "off",
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-useless-escape": "off", // Temporarily disabled to unblock
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/anchor-is-valid": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
      "jsx-a11y/no-noninteractive-element-to-interactive-role": "off",
      "jsx-a11y/heading-has-content": "off",
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": "off",
      "react/display-name": "off",
      // Warn against direct Supabase imports in components - use data hooks instead
      "no-restricted-imports": ["warn", {
        "paths": [{
          "name": "@/integrations/supabase/client",
          "message": "Use data hooks from @/hooks/data instead of direct Supabase imports in components. See src/hooks/data/index.ts for available hooks."
        }]
      }]
    },
  },
  {
    files: ["backend/scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module"
    },
    rules: {
      // No specific rules needed yet, just correct parsing
    }
  }
);
