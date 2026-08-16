import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [react()],
	test: {
		projects: [
			{
				test: {
					alias: {
						'@/': new URL('./src/', import.meta.url).pathname,
					},
					include: ['{src,scripts}/**/*.test.{ts,tsx}'],
					exclude: ['**/*.browser.test.{ts,tsx}'],
					name: 'unit',
					environment: 'node',
				},
			},
			{
				test: {
					alias: {
						'@/': new URL('./src/', import.meta.url).pathname,
					},
					include: ['src/**/*.browser.test.{ts,tsx}'],
					name: 'browser',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
})
