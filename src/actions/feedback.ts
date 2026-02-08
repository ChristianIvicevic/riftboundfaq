'use server'

import { PostHog } from 'posthog-node'
import { type ActionResponse, BlockFeedback, PageFeedback } from '@/components/feedback/schema'
import { env } from '@/env'

async function captureAnalyticsEvent(
	eventName: string,
	properties: Record<string, unknown>,
): Promise<ActionResponse> {
	if (!env.POSTHOG_API_KEY) {
		console.warn('POSTHOG_API_KEY is missing. Feedback analytics will not be captured.')
		return {}
	}

	const client = new PostHog(env.POSTHOG_API_KEY, { host: 'https://us.i.posthog.com' })
	client.capture({
		event: eventName,
		properties: {
			$process_person_profile: false,
			...properties,
			isProduction: process.env.NODE_ENV === 'production',
		},
	})
	await client.shutdown()
	return {}
}

export async function submitPageFeedback(feedback: PageFeedback): Promise<ActionResponse> {
	return captureAnalyticsEvent('page feedback submitted', feedback)
}

export async function submitBlockFeedback(feedback: BlockFeedback): Promise<ActionResponse> {
	return captureAnalyticsEvent('block feedback submitted', feedback)
}
