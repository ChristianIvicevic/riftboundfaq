import { describe, expect, test } from 'vitest'
import {
	coreRulesConventions,
	InvalidRulesVersionError,
	recognizeRulesSourceFilename,
	rulesDocumentFamily,
	tournamentRulesConventions,
	UnknownRulesDocumentFamilyError,
} from './document-family-conventions'

describe('Rules document family conventions', () => {
	test('derives Core Rules conventions from one canonical version', () => {
		const conventions = coreRulesConventions.version('1.4')

		expect(conventions).toStrictEqual({
			family: 'core-rules',
			version: '1.4',
			source: {
				pdfFilename: 'CR-v1.4.pdf',
				transcriptFilename: 'CR-v1.4.txt',
			},
			generated: {
				filename: 'v1-4.ts',
				moduleSpecifier: '@/generated/core-rules/v1-4',
				exportName: 'PDF_CORE_RULES_1_4',
			},
			reference: {
				currentDocumentPath: 'core-rules/1.4.mdx',
				archivedDocumentPath: 'core-rules/(archive)/1.4.mdx',
				changePath: 'core-rules/changes/1.4.mdx',
				documentRoute: '/reference/core-rules/1.4',
				changeRoute: '/reference/core-rules/changes/1.4',
			},
		})
	})

	test('validates and orders canonical Core Rules versions', () => {
		expect(coreRulesConventions.isVersion('1.0')).toBe(true)
		expect(coreRulesConventions.isVersion('1.10')).toBe(true)
		expect(coreRulesConventions.compareVersions('1.2', '1.10')).toBe(-1)
		expect(coreRulesConventions.compareVersions('1.10', '1.2')).toBe(1)
		expect(coreRulesConventions.compareVersions('1.99999999999999999999', '1.10')).toBe(1)

		for (const input of ['1.00', '1.02', '2.0', ' 1.4', '1.4 ', null, 1, 1n]) {
			expect(coreRulesConventions.isVersion(input)).toBe(false)
			expect(() => coreRulesConventions.version(input)).toThrowError(
				expect.objectContaining({
					code: 'INVALID_RULES_VERSION',
					family: 'core-rules',
					input,
				}),
			)
		}
		expect(() => coreRulesConventions.version(null)).toThrowError(InvalidRulesVersionError)
	})

	test('validates and derives Tournament Rules conventions', () => {
		expect(tournamentRulesConventions.version('2026-07-16')).toStrictEqual({
			family: 'tournament-rules',
			version: '2026-07-16',
			source: {
				pdfFilename: 'Tournament-Rules-2026-07-16.pdf',
				transcriptFilename: 'Tournament-Rules-2026-07-16.txt',
			},
			generated: {
				filename: 'v2026-07-16.ts',
				moduleSpecifier: '@/generated/tournament-rules/v2026-07-16',
				exportName: 'PDF_TOURNAMENT_RULES_2026_07_16',
			},
			reference: {
				currentDocumentPath: 'tournament-rules/2026-07-16.mdx',
				archivedDocumentPath: 'tournament-rules/(archive)/2026-07-16.mdx',
				changePath: 'tournament-rules/changes/2026-07-16.mdx',
				documentRoute: '/reference/tournament-rules/2026-07-16',
				changeRoute: '/reference/tournament-rules/changes/2026-07-16',
			},
		})
		expect(tournamentRulesConventions.isVersion('2024-02-29')).toBe(true)
		expect(tournamentRulesConventions.compareVersions('2026-04-29', '2026-07-16')).toBe(-1)

		for (const input of [
			'2026-02-29',
			'2026-04-31',
			'2026-7-16',
			'2026-07-16T00:00:00Z',
			undefined,
			20260716,
		]) {
			expect(tournamentRulesConventions.isVersion(input)).toBe(false)
			expect(() => tournamentRulesConventions.version(input)).toThrowError(
				expect.objectContaining({
					code: 'INVALID_RULES_VERSION',
					family: 'tournament-rules',
					input,
				}),
			)
		}
	})

	test('selects families and recognizes exact canonical source filenames', () => {
		expect(rulesDocumentFamily('core-rules')).toBe(coreRulesConventions)
		expect(rulesDocumentFamily('tournament-rules')).toBe(tournamentRulesConventions)
		expect(recognizeRulesSourceFilename('CR-v1.4.pdf')).toStrictEqual({
			kind: 'pdf',
			family: 'core-rules',
			version: '1.4',
		})
		expect(recognizeRulesSourceFilename('Tournament-Rules-2026-07-16.txt')).toStrictEqual({
			kind: 'transcript',
			family: 'tournament-rules',
			version: '2026-07-16',
		})
		expect(recognizeRulesSourceFilename('CR-v1.4.txt')).toStrictEqual({
			kind: 'transcript',
			family: 'core-rules',
			version: '1.4',
		})
		expect(recognizeRulesSourceFilename('Tournament-Rules-2026-07-16.pdf')).toStrictEqual({
			kind: 'pdf',
			family: 'tournament-rules',
			version: '2026-07-16',
		})
		expect(recognizeRulesSourceFilename('CR-v1.04.pdf')).toBeUndefined()
		expect(recognizeRulesSourceFilename('sources/CR-v1.4.pdf')).toBeUndefined()
		expect(recognizeRulesSourceFilename('Tournament-Rules-2026-02-29.pdf')).toBeUndefined()
		expect(() => rulesDocumentFamily('unknown' as 'core-rules')).toThrowError(
			expect.objectContaining({
				code: 'UNKNOWN_RULES_DOCUMENT_FAMILY',
				family: 'unknown',
			}),
		)
		expect(() => rulesDocumentFamily('unknown' as 'core-rules')).toThrowError(UnknownRulesDocumentFamilyError)
		expect(() => rulesDocumentFamily('constructor' as 'core-rules')).toThrowError(
			UnknownRulesDocumentFamilyError,
		)
	})

	test('freezes family and version conventions', () => {
		expect(coreRulesConventions.generated).toStrictEqual({
			directory: 'core-rules',
			indexModuleSpecifier: '@/generated/core-rules',
			currentVersionExport: 'CURRENT_PDF_CORE_RULES_VERSION',
			documentsExport: 'PDF_CORE_RULES_VERSIONS',
			versionNamesExport: 'PDF_CORE_RULES_VERSION_NAMES',
		})
		expect(tournamentRulesConventions.generated.versionNamesExport).toBeNull()

		const version = coreRulesConventions.version('1.4')
		expect(Object.isFrozen(coreRulesConventions)).toBe(true)
		expect(Object.isFrozen(coreRulesConventions.generated)).toBe(true)
		expect(Object.isFrozen(version)).toBe(true)
		expect(Object.isFrozen(version.source)).toBe(true)
		expect(Object.isFrozen(version.generated)).toBe(true)
		expect(Object.isFrozen(version.reference)).toBe(true)
	})
})
