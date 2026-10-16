import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "scripts/**",
            "dist/**",
            "node_modules/**",
            "test/**",
            "tools/**",
            "*.config.*",
            // Vendored third-party library - not our code to lint.
            "src/utils/moment/**"
        ]
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts"],
        rules: {
            // Transitional: these rules are tripped by pre-existing code (mostly the legacy
            // src/main.ts and src/systems/freeCam.ts). Kept as warnings so `npm run lint` is
            // actionable instead of failing on day one. Promote back to "error" as the debt is
            // paid down.
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "@typescript-eslint/no-empty-object-type": "warn",
            "@typescript-eslint/no-this-alias": "warn",
            "@typescript-eslint/no-wrapper-object-types": "warn",
            "no-empty": ["warn", { allowEmptyCatch: true }],
            "no-useless-escape": "warn",
            "no-var": "warn",
            "no-prototype-builtins": "warn",
            "no-case-declarations": "warn",
            "no-async-promise-executor": "warn",
            "prefer-const": "warn"
        }
    }
);
