import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseRulesManifest } from './rules-manifest.ts'

const VALID_MANIFEST = {
	coreRules: {
		current: '1.10',
		versions: {
			'1.10': { name: 'Tenth' },
			'1.2': { name: 'Second' },
		},
	},
	tournamentRules: {
		current: '2026-10-01',
		versions: {
			'2026-10-01': {},
			'2026-02-01': {},
		},
	},
}

type MutableManifest = {
	coreRules: { current: string; versions: Record<string, unknown> }
	tournamentRules: { current: string; versions: Record<string, unknown> }
}

describe('parseRulesManifest', () => {
	test('returns immutable rules document families in canonical version order', () => {
		const input = structuredClone(VALID_MANIFEST)
		input.coreRules.versions['1.10'].name = ' Tenth '
		const manifest = parseRulesManifest(input)

		expect(manifest).toStrictEqual({
			coreRules: {
				registeredVersions: [
					{ version: '1.2', name: 'Second' },
					{ version: '1.10', name: ' Tenth ' },
				],
				currentVersion: { version: '1.10', name: ' Tenth ' },
			},
			tournamentRules: {
				registeredVersions: [{ version: '2026-02-01' }, { version: '2026-10-01' }],
				currentVersion: { version: '2026-10-01' },
			},
		})
		expect(manifest.coreRules.currentVersion).toBe(manifest.coreRules.registeredVersions.at(-1))
		expect(manifest.tournamentRules.currentVersion).toBe(manifest.tournamentRules.registeredVersions.at(-1))
		expect(Object.isFrozen(manifest)).toBe(true)
		expect(Object.isFrozen(manifest.coreRules)).toBe(true)
		expect(Object.isFrozen(manifest.coreRules.registeredVersions)).toBe(true)
		expect(manifest.coreRules.registeredVersions.every((version) => Object.isFrozen(version))).toBe(true)
		expect(Object.isFrozen(manifest.tournamentRules)).toBe(true)
		expect(Object.isFrozen(manifest.tournamentRules.registeredVersions)).toBe(true)
		expect(manifest.tournamentRules.registeredVersions.every((version) => Object.isFrozen(version))).toBe(
			true,
		)

		input.coreRules.versions['1.10'].name = 'Changed after parsing'
		expect(manifest.coreRules.currentVersion.name).toBe(' Tenth ')
	})

	test('parses the authoritative rules manifest fixture', async () => {
		const path = join(import.meta.dirname, '..', 'sources', 'rules-manifest.json')
		const source: unknown = JSON.parse(await readFile(path, 'utf8'))

		expect(parseRulesManifest(source).coreRules.registeredVersions.length).toBeGreaterThan(0)
	})

	test('reports malformed structure through a stable code and path', () => {
		expect(() => parseRulesManifest(null)).toThrow(
			expect.objectContaining({ code: 'EXPECTED_RECORD', path: '$' }),
		)
	})

	test.each([
		{
			case: 'the root',
			mutate(value: MutableManifest) {
				Object.defineProperty(value, '__proto__', { value: {}, enumerable: true })
			},
			path: '$.__proto__',
		},
		{
			case: 'a rules document family',
			mutate(value: MutableManifest) {
				Object.defineProperty(value.coreRules, '__proto__', { value: {}, enumerable: true })
			},
			path: '$.coreRules.__proto__',
		},
		{
			case: 'a versions record',
			mutate(value: MutableManifest) {
				Object.defineProperty(value.coreRules.versions, '__proto__', { value: {}, enumerable: true })
			},
			path: '$.coreRules.versions.__proto__',
		},
		{
			case: 'version metadata',
			mutate(value: MutableManifest) {
				Object.defineProperty(value.coreRules.versions['1.2'] as object, '__proto__', {
					value: {},
					enumerable: true,
				})
			},
			path: '$.coreRules.versions["1.2"].__proto__',
		},
	])('rejects an own __proto__ property on $case', ({ mutate, path }) => {
		const value: MutableManifest = structuredClone(VALID_MANIFEST)
		mutate(value)

		expect(() => parseRulesManifest(value)).toThrow(
			expect.objectContaining({ code: 'UNEXPECTED_PROPERTY', path }),
		)
	})

	test.each([
		{
			case: 'an unknown root property',
			value: { ...VALID_MANIFEST, extra: true },
			code: 'UNEXPECTED_PROPERTY',
			path: '$.extra',
		},
		{
			case: 'a missing rules document family',
			value: { coreRules: VALID_MANIFEST.coreRules },
			code: 'EXPECTED_RECORD',
			path: '$.tournamentRules',
		},
		{
			case: 'an unknown family property',
			value: {
				...VALID_MANIFEST,
				coreRules: { ...VALID_MANIFEST.coreRules, latest: '1.10' },
			},
			code: 'UNEXPECTED_PROPERTY',
			path: '$.coreRules.latest',
		},
		{
			case: 'a missing current rules version',
			value: {
				...VALID_MANIFEST,
				coreRules: { versions: VALID_MANIFEST.coreRules.versions },
			},
			code: 'EXPECTED_STRING',
			path: '$.coreRules.current',
		},
		{
			case: 'a versions array',
			value: {
				...VALID_MANIFEST,
				coreRules: { current: '1.10', versions: [] },
			},
			code: 'EXPECTED_RECORD',
			path: '$.coreRules.versions',
		},
		{
			case: 'no registered rules versions',
			value: {
				...VALID_MANIFEST,
				coreRules: { current: '1.10', versions: {} },
			},
			code: 'NO_REGISTERED_VERSIONS',
			path: '$.coreRules.versions',
		},
	])('rejects $case', ({ value, code, path }) => {
		expect(() => parseRulesManifest(value)).toThrow(expect.objectContaining({ code, path }))
	})

	test.each([
		{
			case: 'a non-canonical Core Rules version',
			mutate(value: MutableManifest) {
				value.coreRules.current = '1.02'
				value.coreRules.versions = { '1.02': {} }
			},
			code: 'INVALID_CORE_RULES_VERSION',
			path: '$.coreRules.versions["1.02"]',
		},
		{
			case: 'non-record Core Rules metadata',
			mutate(value: MutableManifest) {
				value.coreRules.versions['1.2'] = null as never
			},
			code: 'EXPECTED_RECORD',
			path: '$.coreRules.versions["1.2"]',
		},
		{
			case: 'an unknown Core Rules metadata property',
			mutate(value: MutableManifest) {
				value.coreRules.versions['1.2'] = { title: 'Second' } as never
			},
			code: 'UNEXPECTED_PROPERTY',
			path: '$.coreRules.versions["1.2"].title',
		},
		{
			case: 'a whitespace-only Core Rules name',
			mutate(value: MutableManifest) {
				value.coreRules.versions['1.2'] = { name: '  ' }
			},
			code: 'INVALID_CORE_RULES_NAME',
			path: '$.coreRules.versions["1.2"].name',
		},
		{
			case: 'an impossible Tournament Rules date',
			mutate(value: MutableManifest) {
				value.tournamentRules.current = '2026-02-30'
				value.tournamentRules.versions = { '2026-02-30': {} }
			},
			code: 'INVALID_TOURNAMENT_RULES_VERSION',
			path: '$.tournamentRules.versions["2026-02-30"]',
		},
		{
			case: 'Tournament Rules metadata',
			mutate(value: MutableManifest) {
				value.tournamentRules.versions['2026-02-01'] = { name: 'February' }
			},
			code: 'UNEXPECTED_PROPERTY',
			path: '$.tournamentRules.versions["2026-02-01"].name',
		},
	])('rejects $case', ({ mutate, code, path }) => {
		const value: MutableManifest = structuredClone(VALID_MANIFEST)
		mutate(value)
		expect(() => parseRulesManifest(value)).toThrow(expect.objectContaining({ code, path }))
	})

	test('reports registered Core Rules failures in canonical order', () => {
		const value: MutableManifest = structuredClone(VALID_MANIFEST)
		value.coreRules.versions['1.10'] = { name: '' }
		value.coreRules.versions['1.2'] = { name: '' }

		expect(() => parseRulesManifest(value)).toThrow(
			expect.objectContaining({
				code: 'INVALID_CORE_RULES_NAME',
				path: '$.coreRules.versions["1.2"].name',
			}),
		)
	})

	test('fully validates Core Rules before Tournament Rules', () => {
		const value: MutableManifest = structuredClone(VALID_MANIFEST)
		value.coreRules.versions['1.2'] = { name: '' }
		value.tournamentRules = null as never

		expect(() => parseRulesManifest(value)).toThrow(
			expect.objectContaining({
				code: 'INVALID_CORE_RULES_NAME',
				path: '$.coreRules.versions["1.2"].name',
			}),
		)
	})

	test.each([
		{
			case: 'an unregistered current Core Rules version',
			mutate(value: MutableManifest) {
				value.coreRules.current = '1.3'
			},
			code: 'CURRENT_NOT_REGISTERED',
			path: '$.coreRules.current',
		},
		{
			case: 'a current Core Rules version below the greatest version',
			mutate(value: MutableManifest) {
				value.coreRules.current = '1.2'
			},
			code: 'CURRENT_NOT_GREATEST',
			path: '$.coreRules.current',
		},
		{
			case: 'an unregistered current Tournament Rules version',
			mutate(value: MutableManifest) {
				value.tournamentRules.current = '2026-03-01'
			},
			code: 'CURRENT_NOT_REGISTERED',
			path: '$.tournamentRules.current',
		},
		{
			case: 'a current Tournament Rules version below the greatest version',
			mutate(value: MutableManifest) {
				value.tournamentRules.current = '2026-02-01'
			},
			code: 'CURRENT_NOT_GREATEST',
			path: '$.tournamentRules.current',
		},
	])('rejects $case', ({ mutate, code, path }) => {
		const value: MutableManifest = structuredClone(VALID_MANIFEST)
		mutate(value)
		expect(() => parseRulesManifest(value)).toThrow(expect.objectContaining({ code, path }))
	})
})
