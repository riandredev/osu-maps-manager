import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'ui-dist/', 'node_modules/', 'work/', 'downloads/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  {
    files: ['ui-src/**/*.js', 'ui-src/**/*.jsx'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        document: 'readonly',
        window: 'readonly',
        setTimeout: 'readonly',
        React: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.js', 'vitest.config.js'],
    languageOptions: { globals: { URL: 'readonly' } },
  },
);
