import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { Result } from 'effect'
import { expect, it } from 'vitest'
import { classifyRulesInspectionTarget } from './cli'

it('classifies unsupported inspection targets as typed contextual failures', () => {
	const path = 'sources/not-rules.pdf'
	const result = classifyRulesInspectionTarget({ filename: 'not-rules.pdf', path })

	expect(Result.isFailure(result)).toBe(true)
	if (Result.isSuccess(result)) throw new Error('Expected inspection target classification to fail')
	expect(result.failure).toBeInstanceOf(Error)
	expect(result.failure).toMatchObject({
		operation: 'classify-source',
		source: { family: null, path, version: null },
	})
	expect(result.failure).toHaveProperty('_tag', 'RulesInspectionTargetError')
	expect(String(result.failure)).toBe('Error: Unsupported rules PDF filename: not-rules.pdf')
})

it('prints native filesystem diagnostics at the inspection CLI boundary', () => {
	const missingPath = 'sources/CR-vmissing.pdf'
	const result = spawnSync(
		process.execPath,
		[resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/inspect-rules.ts', '--', missingPath],
		{ encoding: 'utf8' },
	)

	expect(result.status).toBe(1)
	expect(result.stdout).toBe('')
	expect(result.stderr).toMatch(/^\[Error: ENOENT: no such file or directory/u)
	expect(result.stderr).not.toMatch(/PlatformError/u)
})
