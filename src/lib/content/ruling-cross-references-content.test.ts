import { globSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
	buildRulingCrossReferenceIndex,
	getRulingCrossReferences,
} from '@/lib/content/ruling-cross-references'
import type { RulingCrossReferenceDefinitions } from '@/lib/content/ruling-cross-references-schema'

type ReferencePage = Parameters<typeof buildRulingCrossReferenceIndex>[0][number]

type ApprovedReference = {
	source: string
	question: string
	destination: string
}

const APPROVED_ABILITIES_REFERENCES: readonly ApprovedReference[] = [
	{
		source: '/cards/astral-heron#moved-during-resolution',
		question: 'When does the game check an "if" condition in a triggered ability?',
		destination: '/general-rules/abilities#trigger-time-conditions',
	},
	{
		source: '/cards/astral-heron#removed-in-response',
		question: "Does removing a triggered ability's source stop that ability?",
		destination: '/general-rules/abilities#source-removal',
	},
	{
		source: '/cards/astral-heron#self-trigger',
		question: 'When does the game check an "if" condition in a triggered ability?',
		destination: '/general-rules/abilities#trigger-time-conditions',
	},
	{
		source: '/cards/azir-sovereign#attack-trigger-without-azir',
		question: "Does removing a triggered ability's source stop that ability?",
		destination: '/general-rules/abilities#source-removal',
	},
	{
		source: '/cards/diana-lunari#ability-finalization-cost',
		question: 'When do I pay a cost in a triggered ability that says "you may"?',
		destination: '/general-rules/abilities#costs-within-instructions',
	},
	{
		source: '/cards/diana-lunari#ability-finalization-cost',
		question: 'When do I choose whether to use a triggered ability that says "you may"?',
		destination: '/general-rules/abilities#optional-trigger-decision',
	},
	{
		source: '/cards/emperors-dais#ability-finalization-cost',
		question: 'When do I pay a cost in a triggered ability that says "you may"?',
		destination: '/general-rules/abilities#costs-within-instructions',
	},
	{
		source: '/cards/emperors-dais#ability-finalization-cost',
		question: 'When do I choose whether to use a triggered ability that says "you may"?',
		destination: '/general-rules/abilities#optional-trigger-decision',
	},
	{
		source: '/cards/irresistible-faefolk#removed-in-response',
		question: "Does removing a triggered ability's source stop that ability?",
		destination: '/general-rules/abilities#source-removal',
	},
	{
		source: '/cards/khazix-mutating-horror#unit-play-in-response',
		question: 'When does the game check an "if" condition in a triggered ability?',
		destination: '/general-rules/abilities#trigger-time-conditions',
	},
	{
		source: '/cards/sunken-temple#mighty-from-assault',
		question: 'When does the game check an "if" condition in a triggered ability?',
		destination: '/general-rules/abilities#trigger-time-conditions',
	},
	{
		source: '/general-rules/targeting#target-definition',
		question: 'When do I pay a cost in a triggered ability that says "you may"?',
		destination: '/general-rules/abilities#costs-within-instructions',
	},
]

const APPROVED_COSTS_REFERENCES: readonly ApprovedReference[] = [
	{
		source: '/cards/applied-researchers#other-spell-costs',
		question: "How is a card's total cost determined?",
		destination: '/general-rules/costs-and-payments#total-cost-determination',
	},
	{
		source: '/cards/ezreal-prodigy#optional-additional-costs',
		question: 'What are optional additional costs?',
		destination: '/general-rules/costs-and-payments#optional-additional-costs',
	},
	{
		source: '/cards/heedless-resurrection#ignore-additional-costs',
		question: 'What costs still apply when I play a card ignoring one or more of its costs?',
		destination: '/general-rules/costs-and-payments#ignored-costs',
	},
	{
		source: '/cards/heedless-resurrection#ignore-additional-costs',
		question: 'What are optional additional costs?',
		destination: '/general-rules/costs-and-payments#optional-additional-costs',
	},
	{
		source: '/cards/lux-crownguard#hard-bargain-payment',
		question: 'Can players react while costs are being paid?',
		destination: '/general-rules/costs-and-payments#cost-reaction-window',
	},
	{
		source: '/cards/sacrifice#cost-reaction-window',
		question: 'Can players react while costs are being paid?',
		destination: '/general-rules/costs-and-payments#cost-reaction-window',
	},
	{
		source: '/cards/temporal-breach#optional-additional-costs',
		question: 'What costs still apply when I play a card ignoring one or more of its costs?',
		destination: '/general-rules/costs-and-payments#ignored-costs',
	},
	{
		source: '/cards/vex-cheerless#hidden-cost-increase',
		question: "How is a card's total cost determined?",
		destination: '/general-rules/costs-and-payments#total-cost-determination',
	},
	{
		source: '/mechanics/repeat#repeat-decision-timing',
		question: "How is a card's total cost determined?",
		destination: '/general-rules/costs-and-payments#total-cost-determination',
	},
]

const APPROVED_PLAYING_CARDS_REFERENCES: readonly ApprovedReference[] = [
	{
		source: '/cards/abandoned-hall#countered-spell',
		question: 'What does "play" mean on a card?',
		destination: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/astral-heron#trigger-timing',
		question: 'What does "play" mean on a card?',
		destination: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/brynhir-thundersong#existing-cards',
		question: 'What does "play" mean on a card?',
		destination: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/consuming-curse#self-count',
		question: 'When does a card leave my trash when I play it from there?',
		destination: '/general-rules/playing-cards#playing-from-trash',
	},
	{
		source: '/cards/fallen-feline#existing-spells',
		question: 'What does "play" mean on a card?',
		destination: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/heedless-resurrection#self-resurrection',
		question: 'What is the process for playing a card?',
		destination: '/general-rules/playing-cards#play-process',
	},
	{
		source: '/cards/promising-future#brynhir-thundersong',
		question: 'What does "play" mean on a card?',
		destination: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/rebuttal#back-off-draw',
		question: 'What does "play" mean on a card?',
		destination: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/rebuttal#play-trigger-controller',
		question: 'What does "play" mean on a card?',
		destination: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/shadow-assassin#self-count',
		question: 'When does a card leave my trash when I play it from there?',
		destination: '/general-rules/playing-cards#playing-from-trash',
	},
	{
		source: '/cards/shadowblade-lurker#self-count',
		question: 'When does a card leave my trash when I play it from there?',
		destination: '/general-rules/playing-cards#playing-from-trash',
	},
	{
		source: '/mechanics/repeat#repeat-decision-timing',
		question: 'What is the process for playing a card?',
		destination: '/general-rules/playing-cards#play-process',
	},
]

const APPROVED_TARGETING_REFERENCES: readonly ApprovedReference[] = [
	{
		source: '/cards/baited-hook#illegal-target',
		question: 'What happens if a target becomes illegal before a spell or ability resolves?',
		destination: '/general-rules/targeting#illegal-targets',
	},
	{
		source: '/cards/hidden-blade#draw-if-illegal',
		question: 'What happens if a target becomes illegal before a spell or ability resolves?',
		destination: '/general-rules/targeting#illegal-targets',
	},
	{
		source: '/cards/lacerate#targeting-restriction',
		question:
			'Does "Kill a unit if it has 3 might or less" mean I can only choose a unit with 3 might or less?',
		destination: '/general-rules/targeting#target-restrictions',
	},
	{
		source: '/cards/lilting-lullaby#own-counter',
		question: 'What happens if a target becomes illegal before a spell or ability resolves?',
		destination: '/general-rules/targeting#illegal-targets',
	},
	{
		source: '/mechanics/equipment#equipment-unit-selection',
		question: 'What makes something a target?',
		destination: '/general-rules/targeting#target-definition',
	},
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

function parseRulingCrossReferences(frontmatter: string) {
	const definitions: RulingCrossReferenceDefinitions = {}
	let inCrossReferences = false
	let sourceAnchor: string | undefined
	let referenceType: 'canonical' | 'interaction' | undefined

	for (const line of frontmatter.split('\n')) {
		if (line === 'rulingCrossReferences:') {
			inCrossReferences = true
			continue
		}
		if (!inCrossReferences) continue
		if (line !== '' && !line.startsWith(' ')) break

		const anchorMatch = /^  ([a-z0-9]+(?:-[a-z0-9]+)*):$/u.exec(line)
		if (anchorMatch) sourceAnchor = anchorMatch[1]

		const typeMatch = /^  - type: "(canonical|interaction)"$/u.exec(line)
		if (typeMatch) referenceType = typeMatch[1] as 'canonical' | 'interaction'

		const destinationMatch = /^    destination: "([^"]+)"$/u.exec(line)
		if (!destinationMatch || !sourceAnchor || !referenceType) continue
		definitions[sourceAnchor] ??= []
		definitions[sourceAnchor].push({ type: referenceType, destination: destinationMatch[1] })
	}

	return Object.keys(definitions).length === 0 ? undefined : definitions
}

function loadRulingPages() {
	return globSync('content/**/*.mdx')
		.filter((path) => path.includes('/(rulings)/'))
		.map((path): ReferencePage & { frontmatter: string; body: string } => {
			const { frontmatter, body } = splitMdx(readFileSync(path, 'utf8'))
			const headings = [...body.matchAll(/^## (.+) \[#([a-z0-9]+(?:-[a-z0-9]+)*)\]$/gmu)].map(
				([, question, anchor]) => ({ question, anchor }),
			)

			return {
				url: routeFromPath(path),
				path,
				frontmatter,
				body,
				data: {
					title: routeFromPath(path),
					toc: headings.map(({ anchor }) => ({ url: `#${anchor}`, depth: 2 })),
					structuredData: {
						headings: headings.map(({ anchor, question }) => ({ id: anchor, content: question })),
					},
					rulingCrossReferences: parseRulingCrossReferences(frontmatter),
				},
			}
		})
}

function compareReferences(left: ApprovedReference, right: ApprovedReference) {
	return left.source.localeCompare(right.source) || left.destination.localeCompare(right.destination)
}

const rulingPages = loadRulingPages()
const rulingCrossReferenceIndex = buildRulingCrossReferenceIndex(rulingPages)

function assertCanonicalFamilyInventory(
	destinationPage: string,
	expectedReferences: readonly ApprovedReference[],
	expectedDestinationReferences: readonly ApprovedReference[] = [],
) {
	const destinationPrefix = `${destinationPage}#`
	const actualReferences: ApprovedReference[] = []

	for (const [source, references] of rulingCrossReferenceIndex) {
		for (const reference of references) {
			if (!reference.url.startsWith(destinationPrefix)) continue
			expect(reference.type).toBe('canonical')
			actualReferences.push({ source, question: reference.question, destination: reference.url })
		}
	}

	expect(actualReferences.toSorted(compareReferences)).toStrictEqual(
		expectedReferences.toSorted(compareReferences),
	)

	for (const page of rulingPages) expect(page.body).not.toContain(destinationPrefix)
	const destination = rulingPages.find((page) => page.url === destinationPage)
	expect(destination?.frontmatter).not.toContain('rulingRelations:')

	const destinationReferences: ApprovedReference[] = []
	for (const heading of destination?.data.structuredData.headings ?? []) {
		for (const reference of getRulingCrossReferences(
			rulingCrossReferenceIndex,
			destinationPage,
			heading.id,
		)) {
			destinationReferences.push({
				source: `${destinationPage}#${heading.id}`,
				question: reference.question,
				destination: reference.url,
			})
		}
	}
	expect(destinationReferences.toSorted(compareReferences)).toStrictEqual(
		expectedDestinationReferences.toSorted(compareReferences),
	)
}

describe('Canonical reference source inventories', () => {
	test('resolves exactly the 12 approved Abilities references without legacy presentations', () => {
		assertCanonicalFamilyInventory('/general-rules/abilities', APPROVED_ABILITIES_REFERENCES)
	})

	test('resolves exactly the 9 approved Costs and Payments references without legacy presentations', () => {
		assertCanonicalFamilyInventory('/general-rules/costs-and-payments', APPROVED_COSTS_REFERENCES)
		expect(
			getRulingCrossReferences(
				rulingCrossReferenceIndex,
				'/cards/heedless-resurrection',
				'ignore-additional-costs',
			).map(({ question }) => question),
		).toStrictEqual([
			'What are optional additional costs?',
			'What costs still apply when I play a card ignoring one or more of its costs?',
		])
	})

	test('resolves exactly the 12 approved Playing Cards references without legacy presentations', () => {
		assertCanonicalFamilyInventory('/general-rules/playing-cards', APPROVED_PLAYING_CARDS_REFERENCES)
		for (const page of rulingPages) {
			expect(page.frontmatter).not.toMatch(/^\s+- "\/general-rules\/playing-cards"$/mu)
		}
		expect(
			getRulingCrossReferences(rulingCrossReferenceIndex, '/mechanics/repeat', 'repeat-decision-timing').map(
				({ question }) => question,
			),
		).toStrictEqual(["How is a card's total cost determined?", 'What is the process for playing a card?'])
	})

	test('resolves exactly the 5 approved Targeting references without legacy presentations', () => {
		assertCanonicalFamilyInventory('/general-rules/targeting', APPROVED_TARGETING_REFERENCES, [
			{
				source: '/general-rules/targeting#target-definition',
				question: 'When do I pay a cost in a triggered ability that says "you may"?',
				destination: '/general-rules/abilities#costs-within-instructions',
			},
		])
	})
})
