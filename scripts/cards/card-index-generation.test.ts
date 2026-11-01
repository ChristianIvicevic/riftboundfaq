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
				name: 'Gangplank, Naval',
				imageUrl: 'https://example.com/gangplank-naval-744x1039.png',
				abilities: 'Give me +2 [Might].',
				effects: 'Set me to 3 [Might], then give me -1 [Might] and - [Might].',
			},
		]),
	)
	await writeFile(
		errataUrl,
		JSON.stringify({
			'Gangplank, Naval': [
				{
					oldText: 'Give me +2 [Might].',
					newText: 'Give me +3 [Might]. I am Mighty while I have 5+ [Might].',
				},
			],
		}),
	)

	await expect(generateCardIndex(catalogUrl, errataUrl, outputUrl)).resolves.toBe(1)
	await expect(readFile(outputUrl, 'utf8')).resolves.toContain(
		'"imageUrl": "https://example.com/gangplank-naval-744x1039.png"',
	)
	await expect(readFile(outputUrl, 'utf8')).resolves.toContain(
		'"currentText": "Give me +3[Might]. I am Mighty while I have 5+[Might]."',
	)
	await expect(readFile(outputUrl, 'utf8')).resolves.toContain(
		'"effectText": "Set me to 3[Might], then give me -1[Might] and -[Might]."',
	)
	await expect(readFile(outputUrl, 'utf8')).resolves.toContain('"hasErrata": true')
})
