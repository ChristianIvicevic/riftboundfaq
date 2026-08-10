import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { RulesManifest } from './rules-manifest.ts'

const ROOT_DIRECTORY = import.meta.dirname
const DEFAULT_OUTPUT_PATH = join(ROOT_DIRECTORY, '..', 'src', 'generated', 'rules-metadata.ts')
const GENERATED_HEADER = '// Generated from sources/rules-manifest.json. Do not edit.\n\n'

export type RulesMetadataSummary = {
	coreRulesVersion: string
	tournamentRulesVersion: string
}

export type PreparedRulesMetadata = {
	contents: string
	summary: RulesMetadataSummary
}

export function prepareRulesMetadata(manifest: RulesManifest): PreparedRulesMetadata {
	const coreRulesVersion = manifest.coreRules.currentVersion.version
	const tournamentRulesVersion = manifest.tournamentRules.currentVersion.version
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
