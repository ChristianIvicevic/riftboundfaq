import { z, type ZodIssue } from 'zod'

export type RegisteredCoreRulesVersion = Readonly<{
	version: string
	name?: string
}>

export type RegisteredTournamentRulesVersion = Readonly<{
	version: string
}>

export type RulesDocumentFamily<RegisteredVersion> = Readonly<{
	registeredVersions: readonly [RegisteredVersion, ...RegisteredVersion[]]
	currentVersion: RegisteredVersion
}>

export type CoreRulesFamily = RulesDocumentFamily<RegisteredCoreRulesVersion>
export type TournamentRulesFamily = RulesDocumentFamily<RegisteredTournamentRulesVersion>

export type RulesManifest = Readonly<{
	coreRules: CoreRulesFamily
	tournamentRules: TournamentRulesFamily
}>

export type RulesManifestErrorCode =
	| 'EXPECTED_RECORD'
	| 'EXPECTED_STRING'
	| 'UNEXPECTED_PROPERTY'
	| 'INVALID_CORE_RULES_VERSION'
	| 'INVALID_TOURNAMENT_RULES_VERSION'
	| 'INVALID_CORE_RULES_NAME'
	| 'NO_REGISTERED_VERSIONS'
	| 'CURRENT_NOT_REGISTERED'
	| 'CURRENT_NOT_GREATEST'

const CORE_RULES_VERSION = /^1\.(0|[1-9]\d*)$/u
const TOURNAMENT_RULES_VERSION = /^\d{4}-\d{2}-\d{2}$/u

export class RulesManifestError extends TypeError {
	constructor(
		message: string,
		readonly code: RulesManifestErrorCode,
		readonly path: string,
	) {
		super(message)
	}
}

function isTournamentRulesVersion(version: string): boolean {
	if (!TOURNAMENT_RULES_VERSION.test(version)) return false
	const date = new Date(`${version}T00:00:00.000Z`)
	return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === version
}

const manifestValue = z.strictObject({
	coreRules: z.unknown(),
	tournamentRules: z.unknown(),
})
const familyValue = z.strictObject({
	current: z.string(),
	versions: z.record(z.string(), z.unknown()),
})
const coreRulesVersionValue = z.string().regex(CORE_RULES_VERSION)
const coreRulesMetadataValue = z.strictObject({
	name: z
		.string()
		.refine((name) => name.trim().length > 0)
		.optional(),
})
const tournamentRulesVersionValue = z.string().refine(isTournamentRulesVersion)
const tournamentRulesMetadataValue = z.strictObject({})

function fail(code: RulesManifestErrorCode, path: string, message: string): never {
	throw new RulesManifestError(`Rules manifest at ${path}: ${message}`, code, path)
}

function rejectPrototypeProperty(value: unknown, path: string): void {
	if (typeof value === 'object' && value !== null && Object.hasOwn(value, '__proto__')) {
		fail('UNEXPECTED_PROPERTY', `${path}.__proto__`, 'unexpected property')
	}
}

function rejectUnexpectedProperty(issue: ZodIssue, path: string): void {
	if (issue.code !== 'unrecognized_keys') return
	const property = issue.keys.toSorted()[0]
	fail('UNEXPECTED_PROPERTY', `${path}.${property}`, 'unexpected property')
}

function parseManifestStructure(value: unknown) {
	rejectPrototypeProperty(value, '$')
	const parsed = manifestValue.safeParse(value)
	if (parsed.success) return parsed.data
	const issue = parsed.error.issues[0]
	rejectUnexpectedProperty(issue, '$')
	if (issue.path.length === 0) fail('EXPECTED_RECORD', '$', 'expected a record')
	fail('EXPECTED_RECORD', `$.${String(issue.path[0])}`, 'expected a record')
}

function parseFamilyStructure(value: unknown, path: string) {
	rejectPrototypeProperty(value, path)
	if (typeof value === 'object' && value !== null && 'versions' in value) {
		rejectPrototypeProperty(value.versions, `${path}.versions`)
	}
	const parsed = familyValue.safeParse(value)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		rejectUnexpectedProperty(issue, path)
		const property = issue.path[0]
		if (property === 'current') fail('EXPECTED_STRING', `${path}.current`, 'expected a string')
		if (property === 'versions') fail('EXPECTED_RECORD', `${path}.versions`, 'expected a record')
		fail('EXPECTED_RECORD', path, 'expected a record')
	}
	if (Object.keys(parsed.data.versions).length === 0) {
		fail('NO_REGISTERED_VERSIONS', `${path}.versions`, 'expected at least one registered version')
	}
	return parsed.data
}

function versionPath(familyPath: string, version: string): string {
	return `${familyPath}.versions[${JSON.stringify(version)}]`
}

function compareCoreRulesVersions(left: string, right: string): number {
	const leftMinor = BigInt(left.slice(2))
	const rightMinor = BigInt(right.slice(2))
	return leftMinor < rightMinor ? -1 : leftMinor > rightMinor ? 1 : 0
}

function parseCoreRulesVersions(
	versions: Record<string, unknown>,
): [RegisteredCoreRulesVersion, ...RegisteredCoreRulesVersion[]] {
	const versionNumbers = Object.keys(versions)
	for (const version of versionNumbers.toSorted()) {
		if (!coreRulesVersionValue.safeParse(version).success) {
			fail(
				'INVALID_CORE_RULES_VERSION',
				versionPath('$.coreRules', version),
				`invalid Core Rules version ${JSON.stringify(version)}`,
			)
		}
	}

	const orderedVersions = versionNumbers.toSorted(compareCoreRulesVersions)
	return orderedVersions.map((version) => {
		const path = versionPath('$.coreRules', version)
		rejectPrototypeProperty(versions[version], path)
		const metadata = coreRulesMetadataValue.safeParse(versions[version])
		if (!metadata.success) {
			const issue = metadata.error.issues[0]
			rejectUnexpectedProperty(issue, path)
			if (issue.path[0] === 'name') {
				fail('INVALID_CORE_RULES_NAME', `${path}.name`, 'expected a non-empty string')
			}
			fail('EXPECTED_RECORD', path, 'expected a record')
		}
		if (metadata.data.name === undefined) return { version }
		return { version, name: metadata.data.name }
	}) as [RegisteredCoreRulesVersion, ...RegisteredCoreRulesVersion[]]
}

function parseTournamentRulesVersions(
	versions: Record<string, unknown>,
): [RegisteredTournamentRulesVersion, ...RegisteredTournamentRulesVersion[]] {
	return Object.keys(versions)
		.toSorted()
		.map((version) => {
			const path = versionPath('$.tournamentRules', version)
			if (!tournamentRulesVersionValue.safeParse(version).success) {
				fail(
					'INVALID_TOURNAMENT_RULES_VERSION',
					path,
					`invalid Tournament Rules version ${JSON.stringify(version)}`,
				)
			}
			rejectPrototypeProperty(versions[version], path)
			const metadata = tournamentRulesMetadataValue.safeParse(versions[version])
			if (!metadata.success) {
				const issue = metadata.error.issues[0]
				rejectUnexpectedProperty(issue, path)
				fail('EXPECTED_RECORD', path, 'expected a record')
			}
			return { version }
		}) as [RegisteredTournamentRulesVersion, ...RegisteredTournamentRulesVersion[]]
}

function freezeFamily<RegisteredVersion extends { version: string }>(
	registeredVersions: [RegisteredVersion, ...RegisteredVersion[]],
	current: string,
	path: string,
): RulesDocumentFamily<Readonly<RegisteredVersion>> {
	const currentVersion = registeredVersions.find(({ version }) => version === current)
	if (!currentVersion) {
		fail('CURRENT_NOT_REGISTERED', path, `current version ${JSON.stringify(current)} is not registered`)
	}
	const greatestVersion = registeredVersions.at(-1)!
	if (currentVersion !== greatestVersion) {
		fail(
			'CURRENT_NOT_GREATEST',
			path,
			`current version ${JSON.stringify(current)} must be the greatest registered version ${JSON.stringify(greatestVersion.version)}`,
		)
	}
	for (const version of registeredVersions) Object.freeze(version)
	Object.freeze(registeredVersions)
	return Object.freeze({
		registeredVersions,
		currentVersion,
	})
}

export function parseRulesManifest(value: unknown): RulesManifest {
	const root = parseManifestStructure(value)
	const coreRules = parseFamilyStructure(root.coreRules, '$.coreRules')
	const coreRulesVersions = parseCoreRulesVersions(coreRules.versions)
	const parsedCoreRules = freezeFamily(coreRulesVersions, coreRules.current, '$.coreRules.current')
	const tournamentRules = parseFamilyStructure(root.tournamentRules, '$.tournamentRules')
	const tournamentRulesVersions = parseTournamentRulesVersions(tournamentRules.versions)

	return Object.freeze({
		coreRules: parsedCoreRules,
		tournamentRules: freezeFamily(
			tournamentRulesVersions,
			tournamentRules.current,
			'$.tournamentRules.current',
		),
	})
}
