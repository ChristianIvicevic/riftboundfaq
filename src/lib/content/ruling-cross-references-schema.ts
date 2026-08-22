import { z } from 'zod'

const kebabCase = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
const answerUrl = z
	.string()
	.regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*#[a-z0-9]+(?:-[a-z0-9]+)*$/u)

const rulingCrossReference = z.discriminatedUnion('type', [
	z.object({ type: z.literal('canonical'), destination: answerUrl }),
	z.object({ type: z.literal('interaction'), destination: answerUrl }),
])

export const rulingCrossReferencesSchema = z
	.record(kebabCase, z.array(rulingCrossReference).min(1))
	.refine((references) => Object.keys(references).length > 0, 'Ruling cross-references must not be empty')

export type RulingCrossReferenceDefinitions = z.infer<typeof rulingCrossReferencesSchema>
