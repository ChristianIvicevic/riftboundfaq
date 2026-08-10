import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import {
	createRulesPublisher,
	type PreparedRulesPublication,
	simulatedPublicationCrash,
} from './rules-publication-internal.ts'

const PRIOR_FILES = new Map([
	['src/generated/rules-metadata.ts', 'prior metadata'],
	['src/generated/core-rules/v1-0.ts', 'prior core version'],
	['src/generated/tournament-rules/v2026-01-01.ts', 'prior tournament version'],
	['content/reference/core-rules/1.0.mdx', 'prior current Core Rules'],
	['content/reference/tournament-rules/2026-01-01.mdx', 'prior current Tournament Rules'],
	['sources/CR-v1.0.txt', 'prior core transcript'],
	['sources/Tournament-Rules-2026-01-01.txt', 'prior tournament transcript'],
])

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
		metadata: 'rules metadata',
		reference: new Map([
			['index.mdx', 'reference overview'],
			['meta.json', 'reference navigation'],
			['core-rules/1.0.mdx', 'current Core Rules'],
			['core-rules/(archive)/0.9.mdx', 'archived Core Rules'],
			['core-rules/changes/1.0.mdx', 'Core Rules change page'],
			['tournament-rules/2026-01-01.mdx', 'current Tournament Rules'],
			['tournament-rules/(archive)/2025-12-01.mdx', 'archived Tournament Rules'],
			['tournament-rules/changes/2026-01-01.mdx', 'Tournament Rules change page'],
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

async function expectPriorPublication(projectDirectory: string) {
	const contents = await Promise.all(
		[...PRIOR_FILES.keys()].map((path) => readFile(join(projectDirectory, path), 'utf8')),
	)
	expect(contents).toStrictEqual([...PRIOR_FILES.values()])
}

async function expectMissing(path: string) {
	await expect(readFile(path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
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
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

		const summary = await publishRules({ projectDirectory })

		expect(summary).toStrictEqual(preparedPublication().summary)
		expect(await readFile(join(projectDirectory, 'src/generated/rules-metadata.ts'), 'utf8')).toBe(
			'rules metadata',
		)
		expect(await readFile(join(projectDirectory, 'src/generated/core-rules/v1-0.ts'), 'utf8')).toBe(
			'core version',
		)
		expect(
			await readFile(join(projectDirectory, 'src/generated/tournament-rules/v2026-01-01.ts'), 'utf8'),
		).toBe('tournament version')
		expect(await readFile(join(projectDirectory, 'content/reference/index.mdx'), 'utf8')).toBe(
			'reference overview',
		)
		expect(await readFile(join(projectDirectory, 'sources/CR-v1.0.txt'), 'utf8')).toBe('core transcript')
		expect(await readFile(join(projectDirectory, 'sources/Tournament-Rules-2026-01-01.txt'), 'utf8')).toBe(
			'tournament transcript',
		)
		expect(await readFile(join(projectDirectory, 'sources/rules-manifest.json'), 'utf8')).toBe(
			'authoritative manifest',
		)
		const preservedContents = await Promise.all(
			[...preservedFiles.keys()].map((path) => readFile(join(projectDirectory, path), 'utf8')),
		)
		expect(preservedContents).toStrictEqual([...preservedFiles.values()])
		expect(
			await readFile(join(projectDirectory, 'content/reference/core-rules/(archive)/0.9.mdx'), 'utf8'),
		).toBe('archived Core Rules')
		expect(
			await readFile(join(projectDirectory, 'content/reference/core-rules/changes/1.0.mdx'), 'utf8'),
		).toBe('Core Rules change page')
	})

	test('rejects removal of a previously published registered rules version before mutation', async () => {
		const projectDirectory = await temporaryProject()
		await writeProjectFile(
			projectDirectory,
			'content/reference/core-rules/(archive)/0.8.mdx',
			'prior durable Core Rules route',
		)
		await writeProjectFile(projectDirectory, 'src/generated/rules-metadata.ts', 'prior metadata')
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })

		await expect(publishRules({ projectDirectory })).rejects.toThrow(/registered Core Rules version 0\.8/u)
		expect(
			await readFile(join(projectDirectory, 'content/reference/core-rules/(archive)/0.8.mdx'), 'utf8'),
		).toBe('prior durable Core Rules route')
		expect(await readFile(join(projectDirectory, 'src/generated/rules-metadata.ts'), 'utf8')).toBe(
			'prior metadata',
		)
	})

	test.each([0, 1, 2, 3, 4, 5])(
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
		await publishRules({ projectDirectory })

		await expectMissing(join(projectDirectory, 'src/generated/core-rules/stale.ts'))
		await expectMissing(join(projectDirectory, 'content/reference/stale.txt'))
		await expectMissing(join(projectDirectory, 'sources/CR-v9.9.txt'))
		await expectMissing(join(projectDirectory, 'sources/Tournament-Rules-1999-01-01.txt'))
		expect(await readFile(join(projectDirectory, 'sources/notes.txt'), 'utf8')).toBe('unrelated source')
	})

	test('restores a stale managed transcript when later replacement fails', async () => {
		const projectDirectory = await temporaryProject()
		await seedPriorPublication(projectDirectory)
		await writeProjectFile(projectDirectory, 'sources/CR-v9.9.txt', 'prior stale transcript')
		const publishRules = createRulesPublisher({
			prepare: async () => preparedPublication(),
			fault: ({ event, index }) => {
				if (event === 'after-replace' && index === 5) throw new Error('replacement failed')
			},
		})

		await expect(publishRules({ projectDirectory })).rejects.toMatchObject({ publicationState: 'prior' })
		expect(await readFile(join(projectDirectory, 'sources/CR-v9.9.txt'), 'utf8')).toBe(
			'prior stale transcript',
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

		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })
		await publishRules({ projectDirectory })
		expect(await readFile(join(projectDirectory, 'src/generated/rules-metadata.ts'), 'utf8')).toBe(
			'rules metadata',
		)
		await expectMissing(join(projectDirectory, '.rules-publication/transaction.json'))
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
		const recoveryPublisher = createRulesPublisher({
			prepare: async () => {
				throw new Error('stop after recovery')
			},
		})

		await expect(recoveryPublisher({ projectDirectory })).rejects.toThrow(/stop after recovery/u)
		await expectPriorPublication(projectDirectory)
		await expectMissing(join(projectDirectory, '.rules-publication/transaction.json'))
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
		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })
		await publishRules({ projectDirectory })

		expect(
			await readFile(join(projectDirectory, 'src/generated/tournament-rules/v2026-01-01.ts'), 'utf8'),
		).toBe('tournament version')
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

		const publishRules = createRulesPublisher({ prepare: async () => preparedPublication() })
		await publishRules({ projectDirectory })
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

	test('rejects a recovery journal with an unknown transition without deleting it', async () => {
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
						backupPath: 'prior/entry-0',
						hadPrior: false,
						status: 'unknown',
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
