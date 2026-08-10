import { describe, expect, test } from 'vitest'
import { parseRulesManifest } from './rules-manifest.ts'
import { prepareRulesMetadata } from './rules-metadata.ts'

const MANIFEST = parseRulesManifest({
	coreRules: { current: '1.4', versions: { '1.3': {}, '1.4': { name: 'Spiritforged' } } },
	tournamentRules: {
		current: '2026-07-16',
		versions: { '2026-04-29': {}, '2026-07-16': {} },
	},
})

describe('prepareRulesMetadata', () => {
	test('emits deterministic constants from registered current versions', () => {
		expect(prepareRulesMetadata(MANIFEST)).toStrictEqual({
			contents:
				'// Generated from sources/rules-manifest.json. Do not edit.\n\nexport const CURRENT_CORE_RULES_VERSION = "1.4"\nexport const CURRENT_TOURNAMENT_RULES_VERSION = "2026-07-16"\n',
			summary: { coreRulesVersion: '1.4', tournamentRulesVersion: '2026-07-16' },
		})
	})
})
