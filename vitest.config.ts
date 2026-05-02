import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		exclude: ['tests/**/*.eval.ts', 'node_modules', '.next'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, '.'),
		},
	},
})
