// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.lighthouseci/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.browser,
    },
    rules: {
      // Enforces the project's "no magic numbers" standard: literals must be
      // named constants. Common idioms (0, 1, -1) are allowed inline.
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
          ignoreEnums: true,
          ignoreClassFieldInitialValues: false,
          detectObjects: false,
          // A standalone `type X = 0 | 1 | 2 | 3;` alias is a compile-time-only
          // literal union, not a runtime value — it costs nothing to read
          // (each member is self-documenting in context, e.g. a tier number)
          // and can't "drift" the way a runtime magic number can. Note this
          // only recognizes the literal union as the *entire* RHS of a type
          // alias declaration (`isTSNumericLiteralType` in the rule's own
          // source) — a literal union inline in an interface property or
          // nested in an object type still needs a named type alias
          // extracted, same as `WeaponTier` in `src/game/bases/base.ts`.
          ignoreNumericLiteralTypes: true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      // tsconfig's noPropertyAccessFromIndexSignature *requires* bracket
      // notation for index-signature-only properties (e.g. process.env.CI);
      // without this option the two rules fight each other.
      '@typescript-eslint/dot-notation': ['error', { allowIndexSignaturePropertyAccess: true }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.config.ts', 'e2e/**/*.ts'],
    rules: {
      // Test/config files legitimately use literal fixture values and don't
      // need production-grade return-type annotations.
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  eslintConfigPrettier,
);
