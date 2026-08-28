import { access, mkdir, readdir, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { z } from 'zod'

export type RulesPublicationSummary = Readonly<{
	coreRules: Readonly<{ current: string; versions: number; transcripts: number }>
	tournamentRules: Readonly<{ current: string; versions: number; transcripts: number }>
	reference: Readonly<{ pages: number }>
}>

type PreparedRulesDocumentFamily = Readonly<{
	artifacts: ReadonlyMap<string, string>
	registeredVersions: readonly string[]
	transcripts: ReadonlyMap<string, string>
}>

export type PreparedRulesPublication = Readonly<{
	metadata: string
	coreRules: PreparedRulesDocumentFamily
	tournamentRules: PreparedRulesDocumentFamily
	reference: ReadonlyMap<string, string>
	summary: RulesPublicationSummary
}>

export type RulesPublicationOptions = Readonly<{
	projectDirectory?: string
}>

export type RulesPublicationState = 'prior' | 'recovery-required'

export class RulesPublicationError extends Error {
	readonly publicationState: RulesPublicationState
	declare readonly cause: unknown

	constructor(message: string, publicationState: RulesPublicationState, cause: unknown) {
		super(message, { cause })
		this.name = 'RulesPublicationError'
		this.publicationState = publicationState
		this.cause = cause
	}
}

const simulatedPublicationCrashes = new WeakSet<Error>()

export function simulatedPublicationCrash(message: string): Error {
	const error = new Error(message)
	simulatedPublicationCrashes.add(error)
	return error
}

export type RulesPublisher = (options?: RulesPublicationOptions) => Promise<RulesPublicationSummary>

type PublicationFault = (event: {
	event:
		| 'after-replace'
		| 'before-commit'
		| 'before-rollback'
		| 'after-rollback'
		| 'cleanup'
		| 'after-cleanup-rename'
	index?: number
}) => void | Promise<void>

type RulesPublisherDependencies = Readonly<{
	defaultProjectDirectory?: string
	fault?: PublicationFault
	prepare: (projectDirectory: string) => PreparedRulesPublication | Promise<PreparedRulesPublication>
	warn?: (message: string) => void
}>

const journalEntryValue = z.object({
	livePath: z.string(),
	stagedPath: z.string().nullable(),
	backupPath: z.string(),
	hadPrior: z.boolean(),
	status: z.enum(['pending', 'backing-up', 'backed-up', 'installing', 'installed', 'rolled-back']),
})
const publicationJournalValue = z.object({
	version: z.literal(1),
	state: z.enum(['staging', 'replacing', 'rolling-back', 'committed']),
	entries: z.array(journalEntryValue),
})
const missingPathError = z.object({ code: z.literal('ENOENT') })

type JournalEntry = z.infer<typeof journalEntryValue>
type PublicationJournal = z.infer<typeof publicationJournalValue>
type DesiredEntry =
	| { livePath: string; contents: string | null; kind: 'file' }
	| { livePath: string; contents: ReadonlyMap<string, string>; kind: 'directory' }

const TRANSACTION_DIRECTORY = '.rules-publication'
const COMMITTED_TRANSACTION_DIRECTORY = '.rules-publication-committed'
const JOURNAL_FILE = 'transaction.json'
const CORE_TRANSCRIPT = /^CR-v\d+\.\d+\.txt$/u
const TOURNAMENT_TRANSCRIPT = /^Tournament-Rules-\d{4}-\d{2}-\d{2}\.txt$/u
const FIXED_MANAGED_PATHS = [
	'src/generated/rules-metadata.ts',
	'src/generated/core-rules',
	'src/generated/tournament-rules',
	'content/reference',
] as const
const FIXED_MANAGED_PATH_SET = new Set<string>(FIXED_MANAGED_PATHS)

function outputPath(root: string, path: string): string {
	if (!path || path.includes('\\') || isAbsolute(path) || path.split('/').includes('..')) {
		throw new Error(`Unsafe generated path ${JSON.stringify(path)}`)
	}
	const output = join(root, path)
	const relativePath = relative(root, output)
	if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
		throw new Error(`Unsafe generated path ${JSON.stringify(path)}`)
	}
	return output
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path)
		return true
	} catch (error) {
		if (missingPathError.safeParse(error).success) return false
		throw error
	}
}

async function directoryEntries(directory: string): Promise<string[]> {
	try {
		return await readdir(directory)
	} catch (error) {
		if (missingPathError.safeParse(error).success) return []
		throw error
	}
}

async function writeArtifacts(root: string, artifacts: ReadonlyMap<string, string>) {
	await Promise.all(
		[...artifacts].map(async ([path, contents]) => {
			const destination = outputPath(root, path)
			await mkdir(dirname(destination), { recursive: true })
			await writeFile(destination, contents)
		}),
	)
}

async function publishedVersions(directory: string, pattern: RegExp): Promise<string[]> {
	const entries = [
		...(await directoryEntries(directory)),
		...(await directoryEntries(join(directory, '(archive)'))),
	]
	return entries.flatMap((entry) => {
		const match = pattern.exec(entry)
		return match?.[1] ? [match[1]] : []
	})
}

async function rejectRemovedRegisteredVersions(projectDirectory: string, prepared: PreparedRulesPublication) {
	const referenceDirectory = join(projectDirectory, 'content', 'reference')
	const families = [
		{
			label: 'Core Rules',
			published: await publishedVersions(join(referenceDirectory, 'core-rules'), /^(\d+\.\d+)\.mdx$/u),
			registered: new Set(prepared.coreRules.registeredVersions),
		},
		{
			label: 'Tournament Rules',
			published: await publishedVersions(
				join(referenceDirectory, 'tournament-rules'),
				/^(\d{4}-\d{2}-\d{2})\.mdx$/u,
			),
			registered: new Set(prepared.tournamentRules.registeredVersions),
		},
	]
	for (const { label, published, registered } of families) {
		for (const version of published) {
			if (!registered.has(version)) {
				throw new Error(`Cannot remove previously published registered ${label} version ${version}`)
			}
		}
	}
}

function validateTranscripts(transcripts: ReadonlyMap<string, string>, pattern: RegExp) {
	for (const filename of transcripts.keys()) {
		if (!pattern.test(filename))
			throw new Error(`Unsafe generated transcript path ${JSON.stringify(filename)}`)
	}
}

async function desiredEntries(
	projectDirectory: string,
	prepared: PreparedRulesPublication,
): Promise<DesiredEntry[]> {
	validateTranscripts(prepared.coreRules.transcripts, CORE_TRANSCRIPT)
	validateTranscripts(prepared.tournamentRules.transcripts, TOURNAMENT_TRANSCRIPT)
	const desiredTranscripts = new Map([
		...prepared.coreRules.transcripts,
		...prepared.tournamentRules.transcripts,
	])
	const existingTranscripts = (await directoryEntries(join(projectDirectory, 'sources'))).filter(
		(filename) => CORE_TRANSCRIPT.test(filename) || TOURNAMENT_TRANSCRIPT.test(filename),
	)
	const transcriptNames = new Set([...existingTranscripts, ...desiredTranscripts.keys()])

	return [
		{
			livePath: FIXED_MANAGED_PATHS[0],
			contents: prepared.metadata,
			kind: 'file',
		},
		{
			livePath: FIXED_MANAGED_PATHS[1],
			contents: prepared.coreRules.artifacts,
			kind: 'directory',
		},
		{
			livePath: FIXED_MANAGED_PATHS[2],
			contents: prepared.tournamentRules.artifacts,
			kind: 'directory',
		},
		{
			livePath: FIXED_MANAGED_PATHS[3],
			contents: prepared.reference,
			kind: 'directory',
		},
		...[...transcriptNames].toSorted().map((filename): DesiredEntry => ({
			livePath: `sources/${filename}`,
			contents: desiredTranscripts.get(filename) ?? null,
			kind: 'file',
		})),
	]
}

function transactionPath(projectDirectory: string, path: string): string {
	return outputPath(join(projectDirectory, TRANSACTION_DIRECTORY), path)
}

async function writeJournal(projectDirectory: string, journal: PublicationJournal) {
	const root = join(projectDirectory, TRANSACTION_DIRECTORY)
	const path = join(root, JOURNAL_FILE)
	const temporaryPath = `${path}.tmp`
	await writeFile(temporaryPath, `${JSON.stringify(journal, null, 2)}\n`)
	await rename(temporaryPath, path)
}

function validateJournalEntry(entry: JournalEntry) {
	const managed =
		FIXED_MANAGED_PATH_SET.has(entry.livePath) ||
		(/^sources\/[^/]+$/u.test(entry.livePath) &&
			(CORE_TRANSCRIPT.test(entry.livePath.slice('sources/'.length)) ||
				TOURNAMENT_TRANSCRIPT.test(entry.livePath.slice('sources/'.length))))
	if (!managed) throw new Error(`Recovery journal contains unmanaged path ${JSON.stringify(entry.livePath)}`)
	if (!/^staged\/entry-\d+$/u.test(entry.stagedPath ?? 'staged/entry-0')) {
		throw new Error(`Recovery journal contains unsafe staged path ${JSON.stringify(entry.stagedPath)}`)
	}
	if (!/^prior\/entry-\d+$/u.test(entry.backupPath)) {
		throw new Error(`Recovery journal contains unsafe backup path ${JSON.stringify(entry.backupPath)}`)
	}
}

async function readJournal(projectDirectory: string): Promise<PublicationJournal> {
	const journalPath = join(projectDirectory, TRANSACTION_DIRECTORY, JOURNAL_FILE)
	return readJournalFile(journalPath)
}

async function readJournalFile(journalPath: string): Promise<PublicationJournal> {
	const parsed = publicationJournalValue.safeParse(JSON.parse(await readFile(journalPath, 'utf8')))
	if (!parsed.success) throw new Error('Unrecognized rules publication recovery journal')
	const value = parsed.data
	if (value.state !== 'staging' && value.entries.length < FIXED_MANAGED_PATHS.length) {
		throw new Error('Recovery journal does not contain every required managed target')
	}
	const livePaths = new Set<string>()
	const transactionPaths = new Set<string>()
	for (const [index, entry] of value.entries.entries()) {
		validateJournalEntry(entry)
		if (entry.backupPath !== `prior/entry-${index}`) {
			throw new Error(`Recovery journal backup does not match entry ${index}`)
		}
		if (entry.stagedPath !== null && entry.stagedPath !== `staged/entry-${index}`) {
			throw new Error(`Recovery journal staging does not match entry ${index}`)
		}
		if (index < FIXED_MANAGED_PATHS.length && entry.livePath !== FIXED_MANAGED_PATHS[index]) {
			throw new Error(`Recovery journal managed path does not match entry ${index}`)
		}
		if (index >= FIXED_MANAGED_PATHS.length && !entry.livePath.startsWith('sources/')) {
			throw new Error(`Recovery journal transcript path does not match entry ${index}`)
		}
		if (index < FIXED_MANAGED_PATHS.length && entry.stagedPath === null) {
			throw new Error(`Recovery journal cannot remove required target ${entry.livePath}`)
		}
		if (!entry.hadPrior && entry.status === 'backing-up') {
			throw new Error(`Recovery journal cannot back up absent target ${entry.livePath}`)
		}
		if (value.state === 'staging' && value.entries.length > 0) {
			throw new Error('Recovery journal cannot contain staged entries before replacement')
		}
		if (value.state === 'replacing' && entry.status === 'rolled-back') {
			throw new Error('Recovery journal contains rollback progress before rollback')
		}
		if (value.state === 'committed' && entry.status !== 'installed') {
			throw new Error('Committed recovery journal contains an incomplete target')
		}
		if (livePaths.has(entry.livePath)) throw new Error(`Duplicate recovery path ${entry.livePath}`)
		livePaths.add(entry.livePath)
		for (const entryPath of [entry.stagedPath, entry.backupPath]) {
			if (entryPath === null) continue
			if (transactionPaths.has(entryPath)) {
				throw new Error(`Duplicate recovery transaction path ${entryPath}`)
			}
			transactionPaths.add(entryPath)
		}
	}
	return value
}

async function finalizeCommittedTransaction(projectDirectory: string, fault: PublicationFault = () => {}) {
	const transactionDirectory = join(projectDirectory, TRANSACTION_DIRECTORY)
	const committedDirectory = join(projectDirectory, COMMITTED_TRANSACTION_DIRECTORY)
	if (await pathExists(committedDirectory)) {
		throw new Error('Committed rules publication cleanup is already pending')
	}
	await rename(transactionDirectory, committedDirectory)
	await fault({ event: 'after-cleanup-rename' })
	await cleanupCommittedDirectory(committedDirectory)
}

async function cleanupCommittedDirectory(committedDirectory: string) {
	const entries = await directoryEntries(committedDirectory)
	const journalPath = join(committedDirectory, JOURNAL_FILE)
	if (!entries.includes(JOURNAL_FILE)) {
		if (entries.length === 0) {
			await rmdir(committedDirectory)
			return
		}
		throw new Error('Committed rules publication cleanup data has no journal')
	}
	const journal = await readJournalFile(journalPath)
	if (journal.state !== 'committed') {
		throw new Error('Committed rules publication cleanup journal is not committed')
	}
	const knownEntries = new Set(['staged', 'prior', JOURNAL_FILE, `${JOURNAL_FILE}.tmp`])
	const unknownEntries = entries.filter((entry) => !knownEntries.has(entry))
	if (unknownEntries.length > 0) {
		throw new Error(`Committed rules publication cleanup contains unknown data: ${unknownEntries.join(', ')}`)
	}
	await rm(join(committedDirectory, 'staged'), { recursive: true, force: true })
	await rm(join(committedDirectory, 'prior'), { recursive: true, force: true })
	await rm(join(committedDirectory, `${JOURNAL_FILE}.tmp`), { force: true })
	await rm(journalPath)
	await rmdir(committedDirectory)
}

async function finishPendingCommittedCleanup(projectDirectory: string) {
	const committedDirectory = join(projectDirectory, COMMITTED_TRANSACTION_DIRECTORY)
	if (!(await pathExists(committedDirectory))) return
	try {
		await cleanupCommittedDirectory(committedDirectory)
	} catch (cause) {
		throw new RulesPublicationError(
			'Committed rules publication cleanup could not complete',
			'recovery-required',
			cause,
		)
	}
}

async function rollback(
	projectDirectory: string,
	journal: PublicationJournal,
	fault: PublicationFault = () => {},
) {
	const resumingRollback = journal.state === 'rolling-back'
	journal.state = 'rolling-back'
	await writeJournal(projectDirectory, journal)
	// Rollback order and its journal updates must remain serialized for crash recovery.
	// oxlint-disable no-await-in-loop
	for (const [index, entry] of journal.entries.toReversed().entries()) {
		if (entry.status === 'rolled-back') continue
		const livePath = outputPath(projectDirectory, entry.livePath)
		const backupPath = transactionPath(projectDirectory, entry.backupPath)
		if (entry.status === 'pending') {
			entry.status = 'rolled-back'
		} else if (entry.hadPrior) {
			if (await pathExists(backupPath)) {
				await rm(livePath, { recursive: true, force: true })
				await mkdir(dirname(livePath), { recursive: true })
				await rename(backupPath, livePath)
				entry.status = 'rolled-back'
			} else if ((resumingRollback || entry.status === 'backing-up') && (await pathExists(livePath))) {
				entry.status = 'rolled-back'
			} else {
				throw new Error(`Cannot recover prior rules publication path ${entry.livePath}`)
			}
		} else if (entry.status === 'installing' || entry.status === 'installed') {
			await rm(livePath, { recursive: true, force: true })
			entry.status = 'rolled-back'
		} else {
			entry.status = 'rolled-back'
		}
		await writeJournal(projectDirectory, journal)
		await fault({ event: 'after-rollback', index })
	}
	// oxlint-enable no-await-in-loop
}

async function recoverInterruptedPublication(projectDirectory: string) {
	await finishPendingCommittedCleanup(projectDirectory)
	const root = join(projectDirectory, TRANSACTION_DIRECTORY)
	if (!(await pathExists(root))) return
	let journal: PublicationJournal
	try {
		journal = await readJournal(projectDirectory)
	} catch (cause) {
		throw new RulesPublicationError(
			'Rules publication recovery data is not recognized',
			'recovery-required',
			cause,
		)
	}
	try {
		if (journal.state === 'replacing' || journal.state === 'rolling-back') {
			await rollback(projectDirectory, journal)
		}
		if (journal.state === 'committed') await finalizeCommittedTransaction(projectDirectory)
		else await rm(root, { recursive: true })
	} catch (cause) {
		throw new RulesPublicationError(
			'Rules publication recovery could not complete',
			'recovery-required',
			cause,
		)
	}
}

async function stagePublication(
	projectDirectory: string,
	entries: DesiredEntry[],
): Promise<PublicationJournal> {
	const root = join(projectDirectory, TRANSACTION_DIRECTORY)
	await mkdir(join(root, 'staged'), { recursive: true })
	await mkdir(join(root, 'prior'), { recursive: true })
	const journal: PublicationJournal = { version: 1, state: 'staging', entries: [] }
	await writeJournal(projectDirectory, journal)

	// Staging is serialized so the journal's target order is deterministic.
	// oxlint-disable no-await-in-loop
	for (const [index, entry] of entries.entries()) {
		let stagedPath: string | null = null
		if (entry.contents !== null) {
			stagedPath = `staged/entry-${index}`
			const destination = transactionPath(projectDirectory, stagedPath)
			if (entry.kind === 'directory') {
				await mkdir(destination, { recursive: true })
				await writeArtifacts(destination, entry.contents)
			} else {
				await mkdir(dirname(destination), { recursive: true })
				await writeFile(destination, entry.contents)
			}
		}
		journal.entries.push({
			livePath: entry.livePath,
			stagedPath,
			backupPath: `prior/entry-${index}`,
			hadPrior: await pathExists(outputPath(projectDirectory, entry.livePath)),
			status: 'pending',
		})
	}
	// oxlint-enable no-await-in-loop
	journal.state = 'replacing'
	await writeJournal(projectDirectory, journal)
	return journal
}

async function replaceEntry(projectDirectory: string, journal: PublicationJournal, entry: JournalEntry) {
	const livePath = outputPath(projectDirectory, entry.livePath)
	const backupPath = transactionPath(projectDirectory, entry.backupPath)
	if (entry.hadPrior) {
		entry.status = 'backing-up'
		await writeJournal(projectDirectory, journal)
		await mkdir(dirname(backupPath), { recursive: true })
		await rename(livePath, backupPath)
	}
	entry.status = 'backed-up'
	await writeJournal(projectDirectory, journal)
	entry.status = 'installing'
	await writeJournal(projectDirectory, journal)
	if (entry.stagedPath) {
		const stagedPath = transactionPath(projectDirectory, entry.stagedPath)
		await mkdir(dirname(livePath), { recursive: true })
		await rename(stagedPath, livePath)
	}
	entry.status = 'installed'
	await writeJournal(projectDirectory, journal)
}

export function createRulesPublisher({
	defaultProjectDirectory,
	fault = () => {},
	prepare,
	warn = console.warn,
}: RulesPublisherDependencies): RulesPublisher {
	return async ({ projectDirectory = defaultProjectDirectory } = {}) => {
		if (!projectDirectory || !isAbsolute(projectDirectory)) {
			throw new Error('Rules publication requires an absolute project directory')
		}
		await recoverInterruptedPublication(projectDirectory)
		const prepared = await prepare(projectDirectory)
		let entries: DesiredEntry[]
		try {
			await rejectRemovedRegisteredVersions(projectDirectory, prepared)
			entries = await desiredEntries(projectDirectory, prepared)
		} catch (cause) {
			const detail = cause instanceof Error ? `: ${cause.message}` : ''
			throw new RulesPublicationError(`Rules publication validation failed${detail}`, 'prior', cause)
		}
		let journal: PublicationJournal
		try {
			journal = await stagePublication(projectDirectory, entries)
		} catch (cause) {
			await rm(join(projectDirectory, TRANSACTION_DIRECTORY), { recursive: true, force: true })
			throw new RulesPublicationError('Rules publication staging failed', 'prior', cause)
		}

		try {
			// Visible replacements must follow the journal's deterministic order.
			// oxlint-disable no-await-in-loop
			for (const [index, entry] of journal.entries.entries()) {
				await replaceEntry(projectDirectory, journal, entry)
				await fault({ event: 'after-replace', index })
			}
			// oxlint-enable no-await-in-loop
			await fault({ event: 'before-commit' })
			journal.state = 'committed'
			await writeJournal(projectDirectory, journal)
		} catch (cause) {
			if (cause instanceof Error && simulatedPublicationCrashes.has(cause)) throw cause
			try {
				await fault({ event: 'before-rollback' })
				await rollback(projectDirectory, journal, fault)
				await rm(join(projectDirectory, TRANSACTION_DIRECTORY), { recursive: true })
			} catch (rollbackCause) {
				throw new RulesPublicationError(
					'Rules publication failed and requires recovery',
					'recovery-required',
					new AggregateError([cause, rollbackCause]),
				)
			}
			throw new RulesPublicationError('Rules publication failed; prior result restored', 'prior', cause)
		}

		try {
			await fault({ event: 'cleanup' })
			await finalizeCommittedTransaction(projectDirectory, fault)
		} catch (error) {
			warn(`Rules publication committed but cleanup is pending: ${String(error)}`)
		}
		return prepared.summary
	}
}
