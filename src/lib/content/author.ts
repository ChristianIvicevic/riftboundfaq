import { z } from 'zod'

export const author = z.object({
	name: z.string().trim().min(1),
	url: z.url().optional(),
})

export type Author = z.infer<typeof author>
