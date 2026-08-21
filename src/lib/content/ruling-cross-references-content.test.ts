import { globSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const ABILITIES_DESTINATION_PREFIX = '/general-rules/abilities#'

const APPROVED_ABILITIES_REFERENCES = [
	'/cards/astral-heron#moved-during-resolution -> /general-rules/abilities#trigger-time-conditions',
	'/cards/astral-heron#removed-in-response -> /general-rules/abilities#source-removal',
	'/cards/astral-heron#self-trigger -> /general-rules/abilities#trigger-time-conditions',
	'/cards/azir-sovereign#attack-trigger-without-azir -> /general-rules/abilities#source-removal',
	'/cards/diana-lunari#ability-finalization-cost -> /general-rules/abilities#costs-within-instructions',
	'/cards/diana-lunari#ability-finalization-cost -> /general-rules/abilities#optional-trigger-decision',
	'/cards/emperors-dais#ability-finalization-cost -> /general-rules/abilities#costs-within-instructions',
	'/cards/emperors-dais#ability-finalization-cost -> /general-rules/abilities#optional-trigger-decision',
	'/cards/irresistible-faefolk#removed-in-response -> /general-rules/abilities#source-removal',
	'/cards/khazix-mutating-horror#unit-play-in-response -> /general-rules/abilities#trigger-time-conditions',
	'/cards/sunken-temple#mighty-from-assault -> /general-rules/abilities#trigger-time-conditions',
	'/general-rules/targeting#target-definition -> /general-rules/abilities#costs-within-instructions',
]

function splitMdx(source: string) {
	const frontmatterEnd = source.indexOf('\n---\n', 4)
	return {
		frontmatter: source.slice(4, frontmatterEnd),
		body: source.slice(frontmatterEnd + 5),
	}
}

function routeFromPath(path: string) {
	return path.slice(path.indexOf('/(rulings)/') + '/(rulings)'.length, -'.mdx'.length)
}

describe('Abilities Canonical reference source inventory', () => {
	test('declares exactly the 12 approved answer-local references without legacy presentations', () => {
		const paths = globSync('content/**/*.mdx').filter((path) => path.includes('/(rulings)/'))
		const references: string[] = []

		for (const path of paths) {
			const { frontmatter, body } = splitMdx(readFileSync(path, 'utf8'))
			let sourceAnchor: string | undefined
			let referenceType: string | undefined

			for (const line of frontmatter.split('\n')) {
				const anchorMatch = /^  ([a-z0-9]+(?:-[a-z0-9]+)*):$/u.exec(line)
				if (anchorMatch) sourceAnchor = anchorMatch[1]

				const typeMatch = /^  - type: "([a-z]+)"$/u.exec(line)
				if (typeMatch) referenceType = typeMatch[1]

				const destinationMatch = /^    destination: "([^"]+)"$/u.exec(line)
				if (!destinationMatch?.[1].startsWith(ABILITIES_DESTINATION_PREFIX)) continue

				expect(referenceType).toBe('canonical')
				expect(sourceAnchor).toBeDefined()
				references.push(`${routeFromPath(path)}#${sourceAnchor} -> ${destinationMatch[1]}`)
			}

			expect(body).not.toContain(ABILITIES_DESTINATION_PREFIX)
			if (path.endsWith('/general-rules/abilities.mdx')) expect(frontmatter).not.toContain('rulingRelations:')
		}

		expect(references.toSorted()).toStrictEqual(APPROVED_ABILITIES_REFERENCES)
	})
})
