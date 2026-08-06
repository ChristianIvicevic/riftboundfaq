import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const ROOT_DIRECTORY = import.meta.dirname
const DEFAULT_OUTPUT_PATH = join(ROOT_DIRECTORY, '..', 'src', 'generated', 'rules-metadata.ts')
const GENERATED_HEADER = '// Generated from sources/rules-manifest.json. Do not edit.\n\n'

type UnknownRecord = Record<string, unknown>

export type RulesMetadataSummary = {
	coreRulesVersion: string
	tournamentRulesVersion: string
}

export type PreparedRulesMetadata = {
	contents: string
	summary: RulesMetadataSummary
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function currentVersion(manifest: UnknownRecord, documentType: string, label: string): string {
	const metadata = manifest[documentType]
	if (!isRecord(metadata)) throw new TypeError(`expected ${documentType} metadata`)
	const metadataRecord = metadata
	if (typeof metadataRecord.current !== 'string') throw new TypeError(`expected ${documentType}.current`)
	if (!isRecord(metadataRecord.versions)) {
		throw new TypeError(`expected ${documentType}.versions`)
	}
	const versions = metadataRecord.versions
	if (!Object.hasOwn(versions, metadataRecord.current)) {
		throw new TypeError(`current ${label} version ${metadataRecord.current} is not defined`)
	}
	return metadataRecord.current
}

export function prepareRulesMetadata(manifest: unknown): PreparedRulesMetadata {
	if (!isRecord(manifest)) throw new TypeError('expected a manifest object')
	const coreRulesVersion = currentVersion(manifest, 'coreRules', 'Core Rules')
	const tournamentRulesVersion = currentVersion(manifest, 'tournamentRules', 'Tournament Rules')
	const contents = `${GENERATED_HEADER}export const CURRENT_CORE_RULES_VERSION = ${JSON.stringify(coreRulesVersion)}\nexport const CURRENT_TOURNAMENT_RULES_VERSION = ${JSON.stringify(tournamentRulesVersion)}\n`

	return { contents, summary: { coreRulesVersion, tournamentRulesVersion } }
}

export async function publishRulesMetadata(
	{ contents }: PreparedRulesMetadata,
	{ outputPath = DEFAULT_OUTPUT_PATH }: { outputPath?: string } = {},
): Promise<void> {
	await mkdir(dirname(outputPath), { recursive: true })
	await writeFile(outputPath, contents)
}
