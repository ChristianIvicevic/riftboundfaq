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
	const errataUrl = pathToFileURL(join(temporaryDirectory, 'card-errata.json'))
	const outputUrl = pathToFileURL(join(temporaryDirectory, 'missing', 'generated', 'card-index.ts'))
	await writeFile(
		catalogUrl,
		JSON.stringify([
			{
				name: 'Alpha Strike',
				imageUrl: 'https://example.com/alpha-strike-744x1039.png',
				abilities: 'Deal 2.',
				effects: null,
			},
		]),
	)
	await writeFile(errataUrl, '{}')

	await expect(generateCardIndex(catalogUrl, errataUrl, outputUrl)).resolves.toBe(1)
	await expect(readFile(outputUrl, 'utf8')).resolves.toContain(
		'"imageUrl": "https://example.com/alpha-strike-744x1039.png"',
	)
})
