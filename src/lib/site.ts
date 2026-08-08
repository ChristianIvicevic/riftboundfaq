import { env } from '@/env'

export const SITE_NAME = 'Riftbound FAQ'
export const SITE_TITLE = 'Riftbound FAQ: Card Rulings and Rules Answers'
export const SITE_DESCRIPTION =
	'Unofficial, independently maintained Riftbound card rulings and rules answers for players and judges, with examples and Core Rules citations.'
export const GITHUB_REPO_URL = 'https://github.com/ChristianIvicevic/riftboundfaq'
export const X_HANDLE = '@civicevic'

export const SITE_URL =
	env.NODE_ENV === 'development' || !env.VERCEL_PROJECT_PRODUCTION_URL
		? new URL('http://localhost:3000')
		: new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`)
