import { join } from 'node:path'
import { createCoreRulesFamilyAdapter } from './extract-internal.ts'
import { inspectPdf } from './inspect.ts'

const DEFAULT_SOURCES_DIRECTORY = join(import.meta.dirname, '..', '..', 'sources')

export const coreRulesFamilyAdapter = createCoreRulesFamilyAdapter({
	inspectSource: inspectPdf,
	sourcesDirectory: DEFAULT_SOURCES_DIRECTORY,
})
