import { z } from 'zod/mini'

export const MAX_FEEDBACK_MESSAGE_LENGTH = 2_000

const pagePath = z.string().check(z.maxLength(2_048), z.regex(/^\/(?!\/)/u))
const message = z.string().check(z.minLength(1), z.maxLength(MAX_FEEDBACK_MESSAGE_LENGTH))

export const blockFeedback = z.object({
	url: pagePath,
	blockId: z.string().check(z.minLength(1), z.maxLength(4_096)),
	message,
	blockBody: z.optional(z.string().check(z.maxLength(20_000))),
})

export const pageFeedback = z.object({
	opinion: z.enum(['good', 'bad']),
	url: pagePath,
	message,
})

export type BlockFeedback = z.infer<typeof blockFeedback>
export type PageFeedback = z.infer<typeof pageFeedback>
