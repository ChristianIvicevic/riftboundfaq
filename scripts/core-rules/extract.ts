import { join } from 'node:path'
import { createCoreRulesFamilyAdapter } from './extract-internal'
import { inspectPdf } from './inspect'

const DEFAULT_SOURCES_DIRECTORY = join(import.meta.dirname, '..', '..', 'sources')

export const coreRulesFamilyAdapter = createCoreRulesFamilyAdapter({
	inspectSource: inspectPdf,
	sourcesDirectory: DEFAULT_SOURCES_DIRECTORY,
})
