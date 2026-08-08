import { env } from '@/env'

export const SITE_NAME = 'Riftbound FAQ'
export const SITE_DESCRIPTION = 'Independently maintained FAQ for Riftbound judges and players'
export const GITHUB_REPO_URL = 'https://github.com/ChristianIvicevic/riftboundfaq'

export const SITE_URL =
	env.NODE_ENV === 'development' || !env.VERCEL_PROJECT_PRODUCTION_URL
		? new URL('http://localhost:3000')
		: new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`)
