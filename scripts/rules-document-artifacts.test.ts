import { describe, expect, test } from 'vitest'
import { prepareCoreRulesArtifacts } from './core-rules/generate.ts'
import type { ExtractedCoreRulesFamily, ExtractedTournamentRulesFamily } from './rules-document-family.ts'
import { prepareTournamentRulesArtifacts } from './tournament-rules/generate.ts'

describe('rules document artifact preparation', () => {
	test('serializes Core Rules extraction without source knowledge', () => {
		const registeredVersion = { version: '1.0', name: 'Launch' }
		const version: ExtractedCoreRulesFamily['versions'][number] = {
			registeredVersion,
			lastUpdated: '2026-01-01',
			document: { schemaVersion: 3, version: '1.0', sections: [] },
			transcript: 'Core transcript\n',
			diagnostics: [],
		}

		const prepared = prepareCoreRulesArtifacts({ versions: [version], currentVersion: version })

		expect([...prepared.artifacts.keys()]).toStrictEqual(['v1-0.ts', 'index.ts'])
		expect(prepared.artifacts.get('v1-0.ts')).toContain(
			"import type { CoreRulesDocument } from '@/lib/rules/core-rules-document'",
		)
		expect(prepared.artifacts.get('index.ts')).toContain(
			'export const CURRENT_PDF_CORE_RULES_VERSION = "1.0"',
		)
		expect(prepared.transcripts).toStrictEqual(new Map([['CR-v1.0.txt', 'Core transcript\n']]))
		expect(prepared.summary).toStrictEqual({ current: '1.0', transcripts: 1, versions: 1 })
	})

	test('serializes Tournament Rules extraction without source knowledge', () => {
		const registeredVersion = { version: '2026-01-01' }
		const version: ExtractedTournamentRulesFamily['versions'][number] = {
			registeredVersion,
			lastUpdated: registeredVersion.version,
			document: { schemaVersion: 1, version: registeredVersion.version, sections: [] },
			transcript: 'Tournament transcript\n',
			diagnostics: [],
		}

		const prepared = prepareTournamentRulesArtifacts({ versions: [version], currentVersion: version })

		expect([...prepared.artifacts.keys()]).toStrictEqual(['v2026-01-01.ts', 'index.ts'])
		expect(prepared.artifacts.get('v2026-01-01.ts')).toContain(
			"import type { TournamentRulesDocument } from '@/lib/rules/tournament-rules-document'",
		)
		expect(prepared.artifacts.get('index.ts')).toContain(
			'export const CURRENT_PDF_TOURNAMENT_RULES_VERSION = "2026-01-01"',
		)
		expect(prepared.transcripts).toStrictEqual(
			new Map([['Tournament-Rules-2026-01-01.txt', 'Tournament transcript\n']]),
		)
		expect(prepared.summary).toStrictEqual({ current: '2026-01-01', transcripts: 1, versions: 1 })
	})
})
