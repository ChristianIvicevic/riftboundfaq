import { z, type ZodIssue } from 'zod'
import { coreRulesConventions, tournamentRulesConventions } from '@/lib/rules/document-family-conventions'

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

export class RulesManifestError extends TypeError {
	constructor(
		message: string,
		readonly code: RulesManifestErrorCode,
		readonly path: string,
	) {
		super(message)
	}
}

const jsonValue = z.json()
type RulesManifestSource = z.infer<typeof jsonValue>

const manifestValue = z.strictObject({
	coreRules: z.custom<RulesManifestSource>(),
	tournamentRules: z.custom<RulesManifestSource>(),
})
const familyValue = z.strictObject({
	current: z.string(),
	versions: z.record(z.string(), z.custom<RulesManifestSource>()),
})
const familyVersionsProperty = z.object({ versions: z.custom<RulesManifestSource>() })
type FamilyValue = z.infer<typeof familyValue>
type VersionMetadataValues = FamilyValue['versions']
const coreRulesVersionValue = z.string().refine(coreRulesConventions.isVersion)
const coreRulesMetadataValue = z.strictObject({
	name: z
		.string()
		.refine((name) => name.trim().length > 0)
		.optional(),
})
const tournamentRulesVersionValue = z.string().refine(tournamentRulesConventions.isVersion)
const tournamentRulesMetadataValue = z.strictObject({})

function fail(code: RulesManifestErrorCode, path: string, message: string): never {
	throw new RulesManifestError(`Rules manifest at ${path}: ${message}`, code, path)
}

function rejectPrototypeProperty(value: RulesManifestSource, path: string): void {
	if (Object.hasOwn(Object(value), '__proto__')) {
		fail('UNEXPECTED_PROPERTY', `${path}.__proto__`, 'unexpected property')
	}
}

function rejectUnexpectedProperty(issue: ZodIssue, path: string): void {
	if (issue.code !== 'unrecognized_keys') return
	const property = issue.keys.toSorted()[0]
	fail('UNEXPECTED_PROPERTY', `${path}.${property}`, 'unexpected property')
}

function parseManifestStructure(value: RulesManifestSource) {
	rejectPrototypeProperty(value, '$')
	const parsed = manifestValue.safeParse(value)
	if (parsed.success) return parsed.data
	const issue = parsed.error.issues[0]
	rejectUnexpectedProperty(issue, '$')
	if (issue.path.length === 0) fail('EXPECTED_RECORD', '$', 'expected a record')
	fail('EXPECTED_RECORD', `$.${String(issue.path[0])}`, 'expected a record')
}

function parseFamilyStructure(value: RulesManifestSource, path: string): FamilyValue {
	rejectPrototypeProperty(value, path)
	const versionsProperty = familyVersionsProperty.safeParse(value)
	if (versionsProperty.success) {
		rejectPrototypeProperty(versionsProperty.data.versions, `${path}.versions`)
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

function parseCoreRulesVersions(
	versions: VersionMetadataValues,
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

	const registeredVersions = versionNumbers.toSorted(coreRulesConventions.compareVersions).map((version) => {
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
	})
	const [firstVersion, ...remainingVersions] = registeredVersions
	if (!firstVersion) {
		fail('NO_REGISTERED_VERSIONS', '$.coreRules.versions', 'expected at least one registered version')
	}
	return [firstVersion, ...remainingVersions]
}

function parseTournamentRulesVersions(
	versions: VersionMetadataValues,
): [RegisteredTournamentRulesVersion, ...RegisteredTournamentRulesVersion[]] {
	const registeredVersions = Object.keys(versions)
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
		})
	const [firstVersion, ...remainingVersions] = registeredVersions
	if (!firstVersion) {
		fail('NO_REGISTERED_VERSIONS', '$.tournamentRules.versions', 'expected at least one registered version')
	}
	return [firstVersion, ...remainingVersions]
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

export function parseRulesManifest(value: RulesManifestSource): RulesManifest {
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
