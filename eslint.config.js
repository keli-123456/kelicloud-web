import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components/admin/admin-ui',
              message:
                'Legacy admin-ui is deprecated. Prefer src/components/ui/* and DataTableShell/AsyncState.',
            },
            {
              name: '@/components/admin/cloud/cloud-ui',
              message:
                'Legacy cloud-ui is deprecated. Prefer src/components/ui/* and shared admin shells.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: [
      'src/components/ui/**/*.{ts,tsx}',
      'src/components/admin/cloud/cloud-shared.tsx',
      'src/contexts/**/*.{ts,tsx}',
      'src/components/Node.tsx',
      'src/main.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
