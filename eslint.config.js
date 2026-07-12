import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'work/', 'downloads/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  {
    files: ['ui/**/*.js'],
    languageOptions: {
      globals: { document: 'readonly', window: 'readonly', setTimeout: 'readonly' },
    },
  },
);
