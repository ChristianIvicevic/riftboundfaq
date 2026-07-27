import { createEnv } from '@t3-oss/env-nextjs'
import { vercel } from '@t3-oss/env-nextjs/presets-zod'
import { z } from 'zod'

export const env = createEnv({
	extends: [vercel()],
	server: {
		NODE_ENV: z.enum(['development', 'production', 'test']),
		POSTHOG_API_KEY: z.string().optional(),
	},
	client: {},
	experimental__runtimeEnv: {},
	emptyStringAsUndefined: true,
})
