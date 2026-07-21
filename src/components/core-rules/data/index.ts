import { RULES_1_1 } from '@/components/core-rules/data/v1-1'
import { RULES_1_2 } from '@/components/core-rules/data/v1-2'
import { RULES_1_3 } from '@/components/core-rules/data/v1-3'
import { RULES_1_4 } from '@/components/core-rules/data/v1-4'
import type { RuleRecord } from '@/components/rules/types'

export type CrdVersion = {
	version: string
	name: string
	lastUpdated: string
	rules: RuleRecord[]
}

export const CRD_VERSIONS: Record<string, CrdVersion> = {
	'1.1': { version: '1.1', name: 'Origins', lastUpdated: '2025-10-01', rules: RULES_1_1 },
	'1.2': { version: '1.2', name: 'Spiritforged', lastUpdated: '2025-12-01', rules: RULES_1_2 },
	'1.3': { version: '1.3', name: 'Unleashed', lastUpdated: '2026-03-30', rules: RULES_1_3 },
	'1.4': { version: '1.4', name: 'Vendetta', lastUpdated: '2026-06-18', rules: RULES_1_4 },
}

// Per-version id -> lines lookup, derived once. A Map (not a plain object) keeps the
// array as the ordered source of truth while giving O(1) access by rule id.
export const RULES_BY_ID: Record<string, Map<string, string[]>> = Object.fromEntries(
	Object.entries(CRD_VERSIONS).map(([version, crd]) => [
		version,
		new Map(crd.rules.map((rule) => [rule.id, rule.lines])),
	]),
)
