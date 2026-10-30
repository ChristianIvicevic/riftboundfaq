import { env } from '@/env'

export const SITE_NAME = 'Riftbound FAQ'
export const SITE_TITLE = 'Riftbound FAQ: Rulings and Rules References'
export const SITE_DESCRIPTION =
	'Unofficial Riftbound rulings and rules references for players and judges, with cited explanations, historical documents, version comparisons, and card errata.'
export const GITHUB_REPO_URL = 'https://github.com/ChristianIvicevic/riftboundfaq'
export const X_HANDLE = '@civicevic'
export const X_URL = 'https://x.com/civicevic'

export const SITE_URL =
	env.NODE_ENV === 'development' || !env.VERCEL_PROJECT_PRODUCTION_URL
		? new URL('http://localhost:3000')
		: new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`)
