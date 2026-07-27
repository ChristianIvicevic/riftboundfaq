import { z } from 'zod'

const kebabCase = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
const internalRoute = z.string().regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/u)

export const rulingRelationsSchema = z
	.record(
		kebabCase,
		z
			.array(internalRoute)
			.min(1)
			.refine((routes) => new Set(routes).size === routes.length, 'Participant routes must be unique'),
	)
	.refine((relations) => Object.keys(relations).length > 0, 'Ruling relations must not be empty')

export type RulingRelationDefinitions = z.infer<typeof rulingRelationsSchema>
