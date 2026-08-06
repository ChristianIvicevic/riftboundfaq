import { describe, expect, test } from 'vitest'
import { publishRules, type RulesAdapter } from './rules-publication.ts'

type RecordedPreparation = { summary: string }

function recordingAdapter(
	events: string[],
	name: string,
	prepared?: RecordedPreparation | Error,
): RulesAdapter<RecordedPreparation> {
	return {
		async prepare() {
			events.push(`prepare:${name}`)
			if (prepared instanceof Error) throw prepared
			return prepared ?? { summary: name }
		},
		async publish() {
			events.push(`publish:${name}`)
		},
	}
}

describe('publishRules', () => {
	test('performs no writes when Tournament Rules preparation fails', async () => {
		const events: string[] = []

		await expect(
			publishRules({
				manifest: {},
				metadataAdapter: recordingAdapter(events, 'metadata'),
				coreRulesAdapter: recordingAdapter(events, 'core-rules'),
				tournamentRulesAdapter: recordingAdapter(
					events,
					'tournament-rules',
					new Error('invalid Tournament Rules'),
				),
				referenceAdapter: recordingAdapter(events, 'reference'),
			}),
		).rejects.toThrow(/invalid Tournament Rules/u)
		expect(events).toStrictEqual(['prepare:metadata', 'prepare:core-rules', 'prepare:tournament-rules'])
	})

	test('performs no writes when reference preparation fails', async () => {
		const events: string[] = []

		await expect(
			publishRules({
				manifest: {},
				metadataAdapter: recordingAdapter(events, 'metadata'),
				coreRulesAdapter: recordingAdapter(events, 'core-rules'),
				tournamentRulesAdapter: recordingAdapter(events, 'tournament-rules'),
				referenceAdapter: recordingAdapter(events, 'reference', new Error('invalid reference template')),
			}),
		).rejects.toThrow(/invalid reference template/u)
		expect(events).toStrictEqual([
			'prepare:metadata',
			'prepare:core-rules',
			'prepare:tournament-rules',
			'prepare:reference',
		])
	})
})
