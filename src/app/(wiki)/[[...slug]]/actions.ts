'use server'

import { PostHog } from 'posthog-node'
import { type ActionResponse, BlockFeedback, PageFeedback } from '@/components/feedback/schema'
import { env } from '@/env'

export async function submitPageFeedback(feedback: PageFeedback): Promise<ActionResponse> {
	if (!env.POSTHOG_API_KEY) {
		console.warn('POSTHOG_API_KEY is missing. Feedback analytics will not be captured.')
		return {}
	}

	const client = new PostHog(env.POSTHOG_API_KEY, { host: 'https://us.i.posthog.com' })
	client.capture({
		event: 'page feedback submitted',
		properties: { $process_person_profile: false, ...feedback },
	})
	return {}
}

export async function submitBlockFeedback(feedback: BlockFeedback): Promise<ActionResponse> {
	if (!env.POSTHOG_API_KEY) {
		console.warn('POSTHOG_API_KEY is missing. Feedback analytics will not be captured.')
		return {}
	}

	const client = new PostHog(env.POSTHOG_API_KEY, { host: 'https://us.i.posthog.com' })
	client.capture({
		event: 'block feedback submitted',
		properties: { $process_person_profile: false, ...feedback },
	})
	return {}
}
