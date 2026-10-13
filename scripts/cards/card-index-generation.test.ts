import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, onTestFinished, test } from 'vitest'
import { generateCardIndex } from './card-index-generation'

test('generates the card index when the output directory does not exist', async () => {
	const temporaryDirectory = await mkdtemp(join(tmpdir(), 'riftbound-card-index-'))
	onTestFinished(() => rm(temporaryDirectory, { recursive: true }))
	const catalogUrl = pathToFileURL(join(temporaryDirectory, 'card-catalog.json'))
	const outputUrl = pathToFileURL(join(temporaryDirectory, 'missing', 'generated', 'card-index.ts'))
	await writeFile(
		catalogUrl,
		JSON.stringify([{ name: 'Alpha Strike', imageUrl: 'https://example.com/alpha-strike.png' }]),
	)

	await expect(generateCardIndex(catalogUrl, outputUrl)).resolves.toBe(1)
	await expect(readFile(outputUrl, 'utf8')).resolves.toContain(
		'"Alpha Strike": "https://example.com/alpha-strike.png"',
	)
})
