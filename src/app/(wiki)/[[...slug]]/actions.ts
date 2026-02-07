'use server'

import { PostHog } from 'posthog-node'
import { type ActionResponse, BlockFeedback, PageFeedback } from '@/components/feedback/schema'

export async function submitPageFeedback(feedback: PageFeedback): Promise<ActionResponse> {
	if (!process.env.POSTHOG_API_KEY) return {}

	const client = new PostHog(process.env.POSTHOG_API_KEY, { host: 'https://us.i.posthog.com' })
	client.capture({
		event: 'page feedback submitted',
		properties: { $process_person_profile: false, ...feedback },
	})
	return {}
}

export async function submitBlockFeedback(feedback: BlockFeedback): Promise<ActionResponse> {
	if (!process.env.POSTHOG_API_KEY) return {}

	const client = new PostHog(process.env.POSTHOG_API_KEY, { host: 'https://us.i.posthog.com' })
	client.capture({
		event: 'block feedback submitted',
		properties: { $process_person_profile: false, ...feedback },
	})
	return {}
}
