import { defineConfig } from '@playwright/test'

const isCI = Boolean(process.env.CI)
const baseURL = 'http://localhost:3000'

export default defineConfig({
	testDir: './e2e',
	forbidOnly: isCI,
	workers: isCI ? 1 : undefined,
	reporter: isCI ? 'github' : 'list',
	use: {
		baseURL,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: isCI ? 'pnpm start' : 'pnpm dev',
		url: baseURL,
		reuseExistingServer: !isCI,
		timeout: 120_000,
	},
})
