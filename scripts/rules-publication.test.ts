import { describe, expect, test } from 'vitest'
import { parseRulesManifest } from './rules-manifest.ts'
import {
	publishRules,
	type RulesAdapter,
	type RulesDocumentFamilyPublicationAdapter,
} from './rules-publication.ts'

type RecordedPreparation = { summary: string }

function recordingAdapter(
	events: string[],
	name: string,
	prepared?: RecordedPreparation | Error,
): RulesAdapter<unknown, RecordedPreparation> {
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

function recordingFamilyAdapter(
	events: string[],
	name: string,
	extracted?: string | Error,
	prepared?: Error,
): RulesDocumentFamilyPublicationAdapter<unknown, string, RecordedPreparation> {
	return {
		async extract() {
			events.push(`extract:${name}`)
			if (extracted instanceof Error) throw extracted
			return extracted ?? name
		},
		async prepare() {
			events.push(`prepare:${name}`)
			if (prepared) throw prepared
			return { summary: name }
		},
		async publish() {
			events.push(`publish:${name}`)
		},
	}
}

const MANIFEST = parseRulesManifest({
	coreRules: { current: '1.0', versions: { '1.0': {} } },
	tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
})

describe('publishRules', () => {
	test('performs no writes when Tournament Rules extraction fails', async () => {
		const events: string[] = []

		await expect(
			publishRules({
				manifest: MANIFEST,
				metadataAdapter: recordingAdapter(events, 'metadata'),
				coreRulesAdapter: recordingFamilyAdapter(events, 'core-rules'),
				tournamentRulesAdapter: recordingFamilyAdapter(
					events,
					'tournament-rules',
					new Error('invalid Tournament Rules'),
				),
				referenceAdapter: recordingAdapter(events, 'reference'),
			}),
		).rejects.toThrow(/invalid Tournament Rules/u)
		expect(events).toStrictEqual([
			'prepare:metadata',
			'extract:core-rules',
			'prepare:core-rules',
			'extract:tournament-rules',
		])
	})

	test('performs no writes when reference preparation fails', async () => {
		const events: string[] = []

		await expect(
			publishRules({
				manifest: MANIFEST,
				metadataAdapter: recordingAdapter(events, 'metadata'),
				coreRulesAdapter: recordingFamilyAdapter(events, 'core-rules'),
				tournamentRulesAdapter: recordingFamilyAdapter(events, 'tournament-rules'),
				referenceAdapter: recordingAdapter(events, 'reference', new Error('invalid reference template')),
			}),
		).rejects.toThrow(/invalid reference template/u)
		expect(events).toStrictEqual([
			'prepare:metadata',
			'extract:core-rules',
			'prepare:core-rules',
			'extract:tournament-rules',
			'prepare:tournament-rules',
			'prepare:reference',
		])
	})

	test('performs no writes when rules document artifact preparation fails', async () => {
		const events: string[] = []

		await expect(
			publishRules({
				manifest: MANIFEST,
				metadataAdapter: recordingAdapter(events, 'metadata'),
				coreRulesAdapter: recordingFamilyAdapter(
					events,
					'core-rules',
					undefined,
					new Error('invalid Core Rules artifacts'),
				),
				tournamentRulesAdapter: recordingFamilyAdapter(events, 'tournament-rules'),
				referenceAdapter: recordingAdapter(events, 'reference'),
			}),
		).rejects.toThrow(/invalid Core Rules artifacts/u)
		expect(events).toStrictEqual(['prepare:metadata', 'extract:core-rules', 'prepare:core-rules'])
	})
})
