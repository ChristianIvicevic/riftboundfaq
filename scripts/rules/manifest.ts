import { Data, Result, Schema } from 'effect'
import { coreRulesConventions, tournamentRulesConventions } from '@/lib/rules/document-family-conventions'

export type RegisteredCoreRulesVersion = Readonly<{
	version: string
	name?: string
}>

export type RegisteredTournamentRulesVersion = Readonly<{
	version: string
}>

type RulesFamilyHistory<RegisteredVersion> = Readonly<{
	registeredVersions: readonly [RegisteredVersion, ...RegisteredVersion[]]
	currentVersion: RegisteredVersion
}>

export type CoreRulesFamily = RulesFamilyHistory<RegisteredCoreRulesVersion>
export type TournamentRulesFamily = RulesFamilyHistory<RegisteredTournamentRulesVersion>

export type RulesManifest = Readonly<{
	coreRules: CoreRulesFamily
	tournamentRules: TournamentRulesFamily
}>

export class RulesManifestError extends Data.TaggedError('RulesManifestError')<{
	readonly message: string
	readonly cause: unknown
}> {}

const coreRulesMetadataValue = Schema.Struct({
	name: Schema.optional(
		Schema.String.check(
			Schema.makeFilter((name) => name.trim().length > 0, { expected: 'a non-empty string' }),
		),
	),
})
const tournamentRulesMetadataValue = Schema.Record(Schema.String, Schema.Unknown).check(
	Schema.makeFilter((metadata) => Object.keys(metadata).length === 0, {
		expected: 'an empty Tournament Rules metadata object',
	}),
)
const manifestValue = Schema.Struct({
	coreRules: Schema.Struct({
		current: Schema.String,
		versions: Schema.Record(Schema.String, coreRulesMetadataValue),
	}),
	tournamentRules: Schema.Struct({
		current: Schema.String,
		versions: Schema.Record(Schema.String, tournamentRulesMetadataValue),
	}),
})
const decodeManifestValue = Schema.decodeUnknownResult(manifestValue, { onExcessProperty: 'error' })

type ManifestValue = typeof manifestValue.Type

function failure(path: string, message: string): Result.Result<never, RulesManifestError> {
	return Result.fail(
		new RulesManifestError({
			message: `Invalid rules manifest at ${path}: ${message}`,
			cause: undefined,
		}),
	)
}

function versionPath(familyPath: string, version: string): string {
	return `${familyPath}.versions[${JSON.stringify(version)}]`
}

function selectCurrentVersion<RegisteredVersion extends { version: string }>(
	registeredVersions: readonly [RegisteredVersion, ...RegisteredVersion[]],
	current: string,
	path: string,
): Result.Result<RulesFamilyHistory<RegisteredVersion>, RulesManifestError> {
	const currentVersion = registeredVersions.find(({ version }) => version === current)
	if (!currentVersion) {
		return failure(path, `current version ${JSON.stringify(current)} is not registered`)
	}

	const greatestVersion = registeredVersions.at(-1)!
	if (currentVersion.version !== greatestVersion.version) {
		return failure(
			path,
			`current version ${JSON.stringify(current)} must be the greatest registered version ${JSON.stringify(greatestVersion.version)}`,
		)
	}

	return Result.succeed({ registeredVersions, currentVersion })
}

function parseCoreRulesFamily(
	value: ManifestValue['coreRules'],
): Result.Result<CoreRulesFamily, RulesManifestError> {
	return Result.gen(function* () {
		const versions = Object.keys(value.versions)
		for (const version of versions.toSorted()) {
			if (!coreRulesConventions.isVersion(version)) {
				return yield* failure(
					versionPath('$.coreRules', version),
					`invalid Core Rules version ${JSON.stringify(version)}`,
				)
			}
		}

		const registeredVersions = versions.toSorted(coreRulesConventions.compareVersions).map((version) => {
			const name = value.versions[version].name
			return name === undefined ? { version } : { version, name }
		})
		const [firstVersion, ...remainingVersions] = registeredVersions
		if (!firstVersion) {
			return yield* failure('$.coreRules.versions', 'expected at least one registered version')
		}

		return yield* selectCurrentVersion(
			[firstVersion, ...remainingVersions],
			value.current,
			'$.coreRules.current',
		)
	})
}

function parseTournamentRulesFamily(
	value: ManifestValue['tournamentRules'],
): Result.Result<TournamentRulesFamily, RulesManifestError> {
	return Result.gen(function* () {
		const versions = Object.keys(value.versions)
		for (const version of versions.toSorted()) {
			if (!tournamentRulesConventions.isVersion(version)) {
				return yield* failure(
					versionPath('$.tournamentRules', version),
					`invalid Tournament Rules version ${JSON.stringify(version)}`,
				)
			}
		}

		const registeredVersions = versions
			.toSorted(tournamentRulesConventions.compareVersions)
			.map((version) => ({ version }))
		const [firstVersion, ...remainingVersions] = registeredVersions
		if (!firstVersion) {
			return yield* failure('$.tournamentRules.versions', 'expected at least one registered version')
		}

		return yield* selectCurrentVersion(
			[firstVersion, ...remainingVersions],
			value.current,
			'$.tournamentRules.current',
		)
	})
}

export function parseRulesManifest(value: Schema.Json): Result.Result<RulesManifest, RulesManifestError> {
	const decoded = decodeManifestValue(value)
	if (Result.isFailure(decoded)) {
		return Result.fail(
			new RulesManifestError({
				message: `Invalid rules manifest:\n${decoded.failure.message}`,
				cause: decoded.failure,
			}),
		)
	}

	return Result.gen(function* () {
		return {
			coreRules: yield* parseCoreRulesFamily(decoded.success.coreRules),
			tournamentRules: yield* parseTournamentRulesFamily(decoded.success.tournamentRules),
		}
	})
}
