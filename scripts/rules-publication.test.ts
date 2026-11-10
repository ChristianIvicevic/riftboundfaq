import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import { z } from 'zod'
import {
	createRulesPublisher,
	type PreparedRulesPublication,
	simulatedPublicationCrash,
} from './rules-publication-internal'

const FIXED_MANAGED_PATHS = [
	'src/generated/rules-metadata.ts',
	'src/generated/core-rules',
	'src/generated/tournament-rules',
	'content/reference',
	'content/rules-documents',
] as const
const MANAGED_ROOTS = ['src/generated', 'content', 'sources'] as const
const MANAGED_TRANSCRIPT_PATH = /^sources\/(?:CR-v\d+\.\d+|Tournament-Rules-\d{4}-\d{2}-\d{2})\.txt$/u
const missingPathError = z.object({ code: z.literal('ENOENT') })

function pathContentMap(entries: Iterable<readonly [string, string]>): Map<string, string> {
	return new Map([...entries].toSorted(([left], [right]) => left.localeCompare(right)))
}

const PRIOR_FILES = pathContentMap([
	['src/generated/rules-metadata.ts', 'prior metadata'],
	['src/generated/core-rules/v1-0.ts', 'prior core version'],
	['src/generated/tournament-rules/v2026-01-01.ts', 'prior tournament version'],
	['content/reference/core-rules/1.0.mdx', 'prior current Core Rules'],
	['content/reference/tournament-rules/2026-01-01.mdx', 'prior current Tournament Rules'],
	['sources/CR-v1.0.txt', 'prior core transcript'],
	['sources/Tournament-Rules-2026-01-01.txt', 'prior tournament transcript'],
])

const LEGACY_MANAGED_PATHS = FIXED_MANAGED_PATHS.slice(0, 4)

function legacyJournalEntries(statuses: readonly ('pending' | 'installed')[], metadataHadPrior = false) {
	return LEGACY_MANAGED_PATHS.map((livePath, index) => ({
		livePath,
		stagedPath: `staged/entry-${index}`,
		backupPath: `prior/entry-${index}`,
		hadPrior: index === 0 && metadataHadPrior,
		status: statuses[index],
	}))
}

function preparedPublication(): PreparedRulesPublication {
	return {
		coreRules: {
			artifacts: new Map([
				['v0-9.ts', 'archived core version'],
				['v1-0.ts', 'core version'],
				['index.ts', 'core index'],
			]),
			registeredVersions: ['0.9', '1.0'],
			transcripts: new Map([['CR-v1.0.txt', 'core transcript']]),
		},
		reference: new Map([
			['index.mdx', 'Rules Documents page'],
			['meta.json', 'reference navigation'],
			['core-rules/1.0.mdx', 'current Core Rules'],
			['core-rules/(archive)/0.9.mdx', 'archived Core Rules'],
			['core-rules/changes/1.0.mdx', 'Core Rules changes page'],
			['tournament-rules/2026-01-01.mdx', 'current Tournament Rules'],
			['tournament-rules/(archive)/2025-12-01.mdx', 'archived Tournament Rules'],
			['tournament-rules/changes/2026-01-01.mdx', 'Tournament Rules changes page'],
		]),
		summary: {
			coreRules: { current: '1.0', transcripts: 1, versions: 2 },
			tournamentRules: { current: '2026-01-01', transcripts: 1, versions: 2 },
			reference: { pages: 7 },
		},
		tournamentRules: {
			artifacts: new Map([
				['v2025-12-01.ts', 'archived tournament version'],
				['v2026-01-01.ts', 'tournament version'],
				['index.ts', 'tournament index'],
			]),
			registeredVersions: ['2025-12-01', '2026-01-01'],
			transcripts: new Map([['Tournament-Rules-2026-01-01.txt', 'tournament transcript']]),
		},
	}
}

function expectedPublishedFiles(prepared = preparedPublication()): Map<string, string> {
	return pathContentMap([
		...[...prepared.coreRules.artifacts].map(
			([path, contents]) => [`src/generated/core-rules/${path}`, contents] as const,
		),
		...[...prepared.tournamentRules.artifacts].map(
			([path, contents]) => [`src/generated/tournament-rules/${path}`, contents] as const,
		),
		...[...prepared.reference].map(
			([path, contents]) => [`content/rules-documents/${path}`, contents] as const,
		),
		...[...prepared.coreRules.transcripts, ...prepared.tournamentRules.transcripts].map(
			([path, contents]) => [`sources/${path}`, contents] as const,
		),
	])
}

async function temporaryProject() {
	const projectDirectory = await mkdtemp(join(tmpdir(), 'riftbound-publication-'))
	onTestFinished(() => rm(projectDirectory, { recursive: true, force: true }))
	await mkdir(join(projectDirectory, 'sources'), { recursive: true })
	await writeFile(join(projectDirectory, 'sources', 'rules-manifest.json'), 'authoritative manifest')
	return projectDirectory
}

async function writeProjectFile(projectDirectory: string, path: string, contents: string) {
	const destination = join(projectDirectory, path)
	await mkdir(dirname(destination), { recursive: true })
	await writeFile(destination, contents)
}

async function seedPriorPublication(projectDirectory: string) {
	await Promise.all(
		[...PRIOR_FILES].map(([path, contents]) => writeProjectFile(projectDirectory, path, contents)),
	)
}

async function readFilesUnder(
	projectDirectory: string,
	relativeDirectory: string,
): Promise<[string, string][]> {
	let entries
	try {
		entries = await readdir(join(projectDirectory, relativeDirectory), { withFileTypes: true })
	} catch (error) {
		if (missingPathError.safeParse(error).success) return []
		throw error
	}

	const files = await Promise.all(
		entries.map(async (entry): Promise<[string, string][]> => {
			const path = `${relativeDirectory}/${entry.name}`
			if (entry.isDirectory()) return readFilesUnder(projectDirectory, path)
			if (!entry.isFile()) return []
			return [[path, await readFile(join(projectDirectory, path), 'utf8')]]
		}),
	)
	return files.flat()
}

async function readManagedPublication(projectDirectory: string): Promise<Map<string, string>> {
	const files = (
		await Promise.all(MANAGED_ROOTS.map((root) => readFilesUnder(projectDirectory, root)))
	).flat()
	return pathContentMap(
		files.filter(
			([path]) =>
				FIXED_MANAGED_PATHS.some(
					(managedPath) => path === managedPath || path.startsWith(`${managedPath}/`),
				) || MANAGED_TRANSCRIPT_PATH.test(path),
		),
	)
}

async function expectManagedPublication(projectDirectory: string, expected: ReadonlyMap<string, string>) {
	expect(await readManagedPublication(projectDirectory)).toStrictEqual(expected)
}

async function expectNoPublicationRecoveryData(projectDirectory: string) {
	await Promise.all([
		expect(readdir(join(projectDirectory, '.rules-publication'))).rejects.toMatchObject({ code: 'ENOENT' }),
		expect(readdir(join(projectDirectory, '.rules-publication-committed'))).rejects.toMatchObject({
			code: 'ENOENT',
		}),
	])
}

async function expectPriorPublication(
	projectDirectory: string,
	expected: ReadonlyMap<string, string> = PRIOR_FILES,
) {
	await expectManagedPublication(projectDirectory, expected)
	await expectNoPublicationRecoveryData(projectDirectory)
}

async function expectMissing(path: string) {
	await expect(readFile(path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
}

async function recoverWithoutRepublishing(projectDirectory: string) {
	const recoveryPublisher = createRulesPublisher({
		prepare: async () => {
			throw new Error('stop after recovery')
		},
	})
	await expect(recoveryPublisher({ projectDirectory })).rejects.toThrow(/stop after recovery/u)
}

describe('publishRules', () => {
	test('publishes the complete generated result and preserves unrelated source files', async () => {
		const projectDirectory = await temporaryProject()
		const preservedFiles = new Map([
			['sources/CR-v1.0.pdf', 'authoritative Core Rules PDF'],
			['sources/card-text.md', 'card text'],
			['templates/reference/index.mdx', 'tracked reference template'],
			['src/generated/unrelated.ts', 'unrelated generated output'],
			['sources/notes.txt', 'unrelated source'],
		])
		await Promise.all(
			[...preservedFiles].map(([path, contents]) => writeProjectFile(projectDirectory, path, contents)),
		)
		await writeProjectFile(projectDirectory, 'content/reference/index.mdx', 'legacy Rules Documents page')
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

		const summary = await publishRules({ projectDirectory })

		expect(summary).toStrictEqual(preparedPublication().summary)
		await expectManagedPublication(projectDirectory, expectedPublishedFiles())
		await expectNoPublicationRecoveryData(projectDirectory)
		expect(await readFile(join(projectDirectory, 'sources/rules-manifest.json'), 'utf8')).toBe(
			'authoritative manifest',
		)
		const preservedContents = await Promise.all(
			[...preservedFiles.keys()].map((path) => readFile(join(projectDirectory, path), 'utf8')),
		)
		expect(preservedContents).toStrictEqual([...preservedFiles.values()])
	})

	test.each(['content/reference', 'content/rules-documents'])(
		'rejects removal of a previously published registered rules version from %s before mutation',
		async (rulesDocumentsDirectory) => {
			const projectDirectory = await temporaryProject()
			await writeProjectFile(
				projectDirectory,
				`${rulesDocumentsDirectory}/core-rules/(archive)/0.8.mdx`,
				'prior version-specific Core Rules page',
			)
			await writeProjectFile(projectDirectory, 'src/generated/rules-metadata.ts', 'prior metadata')
			const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

			await expect(publishRules({ projectDirectory })).rejects.toThrow(/registered Core Rules version 0\.8/u)
			expect(
				await readFile(
					join(projectDirectory, rulesDocumentsDirectory, 'core-rules/(archive)/0.8.mdx'),
					'utf8',
				),
			).toBe('prior version-specific Core Rules page')
			expect(await readFile(join(projectDirectory, 'src/generated/rules-metadata.ts'), 'utf8')).toBe(
				'prior metadata',
			)
		},
	)

	test.each([0, 1, 2, 3, 4, 5, 6])(
		'restores the complete prior publication after replacement transition %i fails',
		async (failureIndex) => {
			const projectDirectory = await temporaryProject()
			await seedPriorPublication(projectDirectory)
			const publishRules = createRulesPublisher({
				prepare: async () => preparedPublication(),
				fault: ({ event, index }) => {
					if (event === 'after-replace' && index === failureIndex) throw new Error('replacement failed')
				},
			})

			await expect(publishRules({ projectDirectory })).rejects.toMatchObject({
				publicationState: 'prior',
			})
			await expectPriorPublication(projectDirectory)
		},
	)

	test('restores the complete prior publication when committing fails', async () => {
		const projectDirectory = await temporaryProject()
		await seedPriorPublication(projectDirectory)
		const publishRules = createRulesPublisher({
			prepare: async () => preparedPublication(),
			fault: ({ event }) => {
				if (event === 'before-commit') throw new Error('commit marker failed')
			},
		})

		await expect(publishRules({ projectDirectory })).rejects.toMatchObject({ publicationState: 'prior' })
		await expectPriorPublication(projectDirectory)
	})

	test('reconciles exact managed sets and remains idempotent', async () => {
		const projectDirectory = await temporaryProject()
		await writeProjectFile(projectDirectory, 'src/generated/core-rules/stale.ts', 'stale runtime')
		await writeProjectFile(projectDirectory, 'content/reference/stale.txt', 'stale reference')
		await writeProjectFile(projectDirectory, 'sources/CR-v9.9.txt', 'stale core transcript')
		await writeProjectFile(
			projectDirectory,
			'sources/Tournament-Rules-1999-01-01.txt',
			'stale tournament transcript',
		)
		await writeProjectFile(projectDirectory, 'sources/notes.txt', 'unrelated source')
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

		await publishRules({ projectDirectory })
		const firstPublication = await readManagedPublication(projectDirectory)
		expect(firstPublication).toStrictEqual(expectedPublishedFiles())

		await publishRules({ projectDirectory })

		expect(await readManagedPublication(projectDirectory)).toStrictEqual(firstPublication)
		await expectNoPublicationRecoveryData(projectDirectory)
		expect(await readFile(join(projectDirectory, 'sources/notes.txt'), 'utf8')).toBe('unrelated source')
	})

	test('restores a stale managed transcript when later replacement fails', async () => {
		const projectDirectory = await temporaryProject()
		await seedPriorPublication(projectDirectory)
		await writeProjectFile(projectDirectory, 'sources/CR-v9.9.txt', 'prior stale transcript')
		const publishRules = createRulesPublisher({
			prepare: async () => preparedPublication(),
			fault: ({ event, index }) => {
				if (event === 'after-replace' && index === 6) throw new Error('replacement failed')
			},
		})

		await expect(publishRules({ projectDirectory })).rejects.toMatchObject({ publicationState: 'prior' })
		await expectPriorPublication(
			projectDirectory,
			pathContentMap([...PRIOR_FILES, ['sources/CR-v9.9.txt', 'prior stale transcript']]),
		)
	})

	test('performs no mutation when preparation fails', async () => {
		const projectDirectory = await temporaryProject()
		await seedPriorPublication(projectDirectory)
		const publishRules = createRulesPublisher({
			prepare: async () => {
				throw new Error('extraction failed')
			},
		})

		await expect(publishRules({ projectDirectory })).rejects.toThrow(/extraction failed/u)
		await expectPriorPublication(projectDirectory)
	})

	test('rejects unsafe generated paths before replacing the prior publication', async () => {
		const projectDirectory = await temporaryProject()
		await seedPriorPublication(projectDirectory)
		const prepared = preparedPublication()
		const publishRules = createRulesPublisher({
			prepare: async () => ({ ...prepared, reference: new Map([['../escaped.mdx', 'unsafe']]) }),
		})

		await expect(publishRules({ projectDirectory })).rejects.toMatchObject({ publicationState: 'prior' })
		await expectPriorPublication(projectDirectory)
		await expectMissing(join(projectDirectory, 'escaped.mdx'))
	})

	test('retains recovery data when rollback fails and recovers it on the next invocation', async () => {
		const projectDirectory = await temporaryProject()
		await seedPriorPublication(projectDirectory)
		const interruptedPublisher = createRulesPublisher({
			prepare: async () => preparedPublication(),
			fault: ({ event, index }) => {
				if (event === 'after-replace' && index === 1) throw new Error('replacement failed')
				if (event === 'before-rollback') throw new Error('rollback failed')
			},
		})

		await expect(interruptedPublisher({ projectDirectory })).rejects.toMatchObject({
			publicationState: 'recovery-required',
		})
		expect(await readFile(join(projectDirectory, '.rules-publication/transaction.json'), 'utf8')).toMatch(
			/"state": "replacing"/u,
		)

		await recoverWithoutRepublishing(projectDirectory)
		await expectPriorPublication(projectDirectory)
	})

	test('resumes an interrupted partial rollback on the next invocation', async () => {
		const projectDirectory = await temporaryProject()
		await seedPriorPublication(projectDirectory)
		const interruptedPublisher = createRulesPublisher({
			prepare: async () => preparedPublication(),
			fault: ({ event, index }) => {
				if (event === 'after-replace' && index === 2) throw new Error('replacement failed')
				if (event === 'after-rollback' && index === 0) throw new Error('rollback interrupted')
			},
		})

		await expect(interruptedPublisher({ projectDirectory })).rejects.toMatchObject({
			publicationState: 'recovery-required',
		})
		expect(await readFile(join(projectDirectory, '.rules-publication/transaction.json'), 'utf8')).toMatch(
			/"state": "rolling-back"/u,
		)
		await recoverWithoutRepublishing(projectDirectory)
		await expectPriorPublication(projectDirectory)
	})

	test('recovers an interrupted replacement before publishing again', async () => {
		const projectDirectory = await temporaryProject()
		await seedPriorPublication(projectDirectory)
		const interruptedPublisher = createRulesPublisher({
			prepare: async () => preparedPublication(),
			fault: ({ event, index }) => {
				if (event === 'after-replace' && index === 2) {
					throw simulatedPublicationCrash('process terminated')
				}
			},
		})

		await expect(interruptedPublisher({ projectDirectory })).rejects.toThrow(/process terminated/u)
		await recoverWithoutRepublishing(projectDirectory)
		await expectPriorPublication(projectDirectory)
	})

	test('recovers a legacy replacement journal that staged generated metadata', async () => {
		const projectDirectory = await temporaryProject()
		await writeProjectFile(projectDirectory, 'src/generated/rules-metadata.ts', 'replacement metadata')
		await writeProjectFile(projectDirectory, '.rules-publication/prior/entry-0', 'prior metadata')
		await writeProjectFile(
			projectDirectory,
			'.rules-publication/transaction.json',
			JSON.stringify({
				version: 1,
				state: 'replacing',
				entries: legacyJournalEntries(['installed', 'pending', 'pending', 'pending'], true),
			}),
		)
		await recoverWithoutRepublishing(projectDirectory)
		expect(await readFile(join(projectDirectory, 'src/generated/rules-metadata.ts'), 'utf8')).toBe(
			'prior metadata',
		)
		await expectMissing(join(projectDirectory, '.rules-publication/transaction.json'))
	})

	test('returns success when committed cleanup is interrupted and cleans up on the next invocation', async () => {
		const projectDirectory = await temporaryProject()
		const warnings: string[] = []
		const publisherWithCleanupFailure = createRulesPublisher({
			prepare: async () => preparedPublication(),
			fault: ({ event }) => {
				if (event === 'after-cleanup-rename') throw new Error('cleanup interrupted')
			},
			warn: (message) => warnings.push(message),
		})

		await expect(publisherWithCleanupFailure({ projectDirectory })).resolves.toStrictEqual(
			preparedPublication().summary,
		)
		expect(warnings).toHaveLength(1)
		expect(
			await readFile(join(projectDirectory, '.rules-publication-committed/transaction.json'), 'utf8'),
		).toMatch(/"state": "committed"/u)

		await expectManagedPublication(projectDirectory, expectedPublishedFiles())
		await recoverWithoutRepublishing(projectDirectory)
		await expectManagedPublication(projectDirectory, expectedPublishedFiles())
		await expectNoPublicationRecoveryData(projectDirectory)
	})

	test('cleans up a legacy committed journal that staged generated metadata', async () => {
		const projectDirectory = await temporaryProject()
		await writeProjectFile(
			projectDirectory,
			'.rules-publication-committed/transaction.json',
			JSON.stringify({
				version: 1,
				state: 'committed',
				entries: legacyJournalEntries(['installed', 'installed', 'installed', 'installed']),
			}),
		)
		const publishRules = createRulesPublisher({
			prepare: async () => {
				throw new Error('stop after cleanup')
			},
		})

		await expect(publishRules({ projectDirectory })).rejects.toThrow(/stop after cleanup/u)
		await expectMissing(join(projectDirectory, '.rules-publication-committed/transaction.json'))
	})

	test('rejects unrecognized recovery data without deleting it', async () => {
		const projectDirectory = await temporaryProject()
		await writeProjectFile(projectDirectory, '.rules-publication/transaction.json', '{"unknown":true}\n')
		await writeProjectFile(projectDirectory, '.rules-publication/unknown.txt', 'preserve me')
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

		await expect(publishRules({ projectDirectory })).rejects.toMatchObject({
			publicationState: 'recovery-required',
		})
		expect(await readFile(join(projectDirectory, '.rules-publication/unknown.txt'), 'utf8')).toBe(
			'preserve me',
		)
	})

	test('rejects a recovery journal whose paths do not match its entries', async () => {
		const projectDirectory = await temporaryProject()
		await writeProjectFile(
			projectDirectory,
			'.rules-publication/transaction.json',
			JSON.stringify({
				version: 1,
				state: 'replacing',
				entries: [
					{
						livePath: 'src/generated/rules-metadata.ts',
						stagedPath: 'staged/entry-0',
						backupPath: 'prior/entry-4',
						hadPrior: false,
						status: 'pending',
					},
				],
			}),
		)
		await writeProjectFile(projectDirectory, '.rules-publication/unknown.txt', 'preserve me')
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

		await expect(publishRules({ projectDirectory })).rejects.toMatchObject({
			publicationState: 'recovery-required',
		})
		expect(await readFile(join(projectDirectory, '.rules-publication/unknown.txt'), 'utf8')).toBe(
			'preserve me',
		)
	})

	test('rejects a replacement journal missing required managed targets', async () => {
		const projectDirectory = await temporaryProject()
		await writeProjectFile(
			projectDirectory,
			'.rules-publication/transaction.json',
			JSON.stringify({ version: 1, state: 'replacing', entries: [] }),
		)
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

		await expect(publishRules({ projectDirectory })).rejects.toMatchObject({
			publicationState: 'recovery-required',
		})
		expect(await readFile(join(projectDirectory, '.rules-publication/transaction.json'), 'utf8')).toMatch(
			/"entries":\[\]/u,
		)
	})

	test('rejects unknown committed cleanup data without deleting it', async () => {
		const projectDirectory = await temporaryProject()
		await writeProjectFile(projectDirectory, '.rules-publication-committed/unknown.txt', 'preserve me')
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

		await expect(publishRules({ projectDirectory })).rejects.toMatchObject({
			publicationState: 'recovery-required',
		})
		expect(await readFile(join(projectDirectory, '.rules-publication-committed/unknown.txt'), 'utf8')).toBe(
			'preserve me',
		)
	})
})
