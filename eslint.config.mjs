import next from 'eslint-config-next'

const config = [
  ...next,
  { ignores: ['.next/**', 'node_modules/**', 'src/types/database.ts', 'playwright-report/**', 'test-results/**', 'supabase/.temp/**'] },
  {
    files: ['src/components/**', 'src/features/**', 'src/app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/server/admin', '@/server/admin/*'], message: 'The service-role client is server-only.' }] },
      ],
    },
  },
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
]

export default config
