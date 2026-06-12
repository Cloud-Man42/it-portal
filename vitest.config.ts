import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['shared/**/*.test.ts', 'server/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
})
