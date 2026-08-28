'use server'

import { after } from 'next/server'
import { PostHog } from 'posthog-node'
import { env } from '@/env'
import {
	blockFeedback,
	pageFeedback,
	type BlockFeedback,
	type PageFeedback,
} from '@/features/feedback/schema'

async function captureAnalyticsEvent(eventName: string, properties: PageFeedback | BlockFeedback) {
	if (!env.POSTHOG_API_KEY) {
		console.warn('POSTHOG_API_KEY is missing. Feedback analytics will not be captured.')
		return
	}

	const client = new PostHog(env.POSTHOG_API_KEY, { host: 'https://us.i.posthog.com' })
	client.capture({
		event: eventName,
		properties: {
			$process_person_profile: false,
			...properties,
			isProduction: env.NODE_ENV === 'production',
		},
	})

	after(async () => {
		await client.shutdown()
	})
}

export async function submitPageFeedback(input: PageFeedback) {
	const result = pageFeedback.safeParse(input)
	if (!result.success) throw new Error('Invalid page feedback')

	await captureAnalyticsEvent('page feedback submitted', result.data)
}

export async function submitBlockFeedback(input: BlockFeedback) {
	const result = blockFeedback.safeParse(input)
	if (!result.success) throw new Error('Invalid block feedback')

	await captureAnalyticsEvent('block feedback submitted', result.data)
}
