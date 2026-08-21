import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import { RulingCrossReferences } from '@/components/ruling-cross-references'

const ABILITIES_REFERENCES = [
	{
		source: '/general-rules/targeting#target-definition',
		question: 'When do I pay a cost in a triggered ability that says "you may"?',
		url: '/general-rules/abilities#costs-within-instructions',
	},
	{
		source: '/cards/diana-lunari#ability-finalization-cost',
		question: 'When do I choose whether to use a triggered ability that says "you may"?',
		url: '/general-rules/abilities#optional-trigger-decision',
	},
	{
		source: '/cards/diana-lunari#ability-finalization-cost',
		question: 'When do I pay a cost in a triggered ability that says "you may"?',
		url: '/general-rules/abilities#costs-within-instructions',
	},
	{
		source: '/cards/emperors-dais#ability-finalization-cost',
		question: 'When do I choose whether to use a triggered ability that says "you may"?',
		url: '/general-rules/abilities#optional-trigger-decision',
	},
	{
		source: '/cards/emperors-dais#ability-finalization-cost',
		question: 'When do I pay a cost in a triggered ability that says "you may"?',
		url: '/general-rules/abilities#costs-within-instructions',
	},
	{
		source: '/cards/khazix-mutating-horror#unit-play-in-response',
		question: 'When does the game check an "if" condition in a triggered ability?',
		url: '/general-rules/abilities#trigger-time-conditions',
	},
	{
		source: '/cards/sunken-temple#mighty-from-assault',
		question: 'When does the game check an "if" condition in a triggered ability?',
		url: '/general-rules/abilities#trigger-time-conditions',
	},
	{
		source: '/cards/astral-heron#self-trigger',
		question: 'When does the game check an "if" condition in a triggered ability?',
		url: '/general-rules/abilities#trigger-time-conditions',
	},
	{
		source: '/cards/astral-heron#moved-during-resolution',
		question: 'When does the game check an "if" condition in a triggered ability?',
		url: '/general-rules/abilities#trigger-time-conditions',
	},
	{
		source: '/cards/azir-sovereign#attack-trigger-without-azir',
		question: "Does removing a triggered ability's source stop that ability?",
		url: '/general-rules/abilities#source-removal',
	},
	{
		source: '/cards/astral-heron#removed-in-response',
		question: "Does removing a triggered ability's source stop that ability?",
		url: '/general-rules/abilities#source-removal',
	},
	{
		source: '/cards/irresistible-faefolk#removed-in-response',
		question: "Does removing a triggered ability's source stop that ability?",
		url: '/general-rules/abilities#source-removal',
	},
] as const

const COSTS_REFERENCES = [
	{
		source: '/cards/applied-researchers#other-spell-costs',
		question: "How is a card's total cost determined?",
		url: '/general-rules/costs-and-payments#total-cost-determination',
	},
	{
		source: '/cards/ezreal-prodigy#optional-additional-costs',
		question: 'What are optional additional costs?',
		url: '/general-rules/costs-and-payments#optional-additional-costs',
	},
	{
		source: '/cards/heedless-resurrection#ignore-additional-costs',
		question: 'What are optional additional costs?',
		url: '/general-rules/costs-and-payments#optional-additional-costs',
	},
	{
		source: '/cards/heedless-resurrection#ignore-additional-costs',
		question: 'What costs still apply when I play a card ignoring one or more of its costs?',
		url: '/general-rules/costs-and-payments#ignored-costs',
	},
	{
		source: '/cards/lux-crownguard#hard-bargain-payment',
		question: 'Can players react while costs are being paid?',
		url: '/general-rules/costs-and-payments#cost-reaction-window',
	},
	{
		source: '/cards/sacrifice#cost-reaction-window',
		question: 'Can players react while costs are being paid?',
		url: '/general-rules/costs-and-payments#cost-reaction-window',
	},
	{
		source: '/cards/temporal-breach#optional-additional-costs',
		question: 'What costs still apply when I play a card ignoring one or more of its costs?',
		url: '/general-rules/costs-and-payments#ignored-costs',
	},
	{
		source: '/cards/vex-cheerless#hidden-cost-increase',
		question: "How is a card's total cost determined?",
		url: '/general-rules/costs-and-payments#total-cost-determination',
	},
	{
		source: '/mechanics/repeat#repeat-decision-timing',
		question: "How is a card's total cost determined?",
		url: '/general-rules/costs-and-payments#total-cost-determination',
	},
] as const

describe('RulingCrossReferences', () => {
	test('renders exact destination questions once in a compact non-heading element', async () => {
		const screen = await render(
			<RulingCrossReferences
				references={[
					{
						type: 'interaction',
						question: 'Does Brynhir Thundersong stop cards already on the chain?',
						url: '/cards/brynhir-thundersong#existing-cards',
					},
					{
						type: 'canonical',
						question: 'What does "play" mean on a card?',
						url: '/general-rules/playing-cards#play-definition',
					},
				]}
			/>,
		)

		await expect.element(screen.getByText('See also:')).toBeVisible()
		await expect
			.element(
				screen.getByRole('link', { name: 'Does Brynhir Thundersong stop cards already on the chain?' }),
			)
			.toHaveAttribute('href', '/cards/brynhir-thundersong#existing-cards')
		await expect
			.element(screen.getByRole('link', { name: 'What does "play" mean on a card?' }))
			.toHaveAttribute('href', '/general-rules/playing-cards#play-definition')
		expect(screen.getByText('See also:').all()).toHaveLength(1)
		expect(screen.container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
	})

	test('remains usable at 390px', async () => {
		await page.viewport(390, 844)
		const screen = await render(
			<div style={{ width: 358 }}>
				<RulingCrossReferences
					references={[
						{
							type: 'interaction',
							question:
								"Does Brynhir Thundersong stop an opponent's card chosen with Promising Future from being played?",
							url: '/cards/promising-future#brynhir-thundersong',
						},
					]}
				/>
			</div>,
		)

		await expect
			.element(
				screen.getByRole('link', {
					name: "Does Brynhir Thundersong stop an opponent's card chosen with Promising Future from being played?",
				}),
			)
			.toBeVisible()
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390)
	})

	test('renders the approved Abilities inventory only at its exact source answers', async () => {
		const sources = [...new Set(ABILITIES_REFERENCES.map(({ source }) => source))]
		const screen = await render(
			<div>
				{sources.map((source) => (
					<section key={source} data-source={source}>
						<RulingCrossReferences
							references={ABILITIES_REFERENCES.filter((reference) => reference.source === source).map(
								({ question, url }) => ({ type: 'canonical', question, url }),
							)}
						/>
					</section>
				))}
				<section data-source="/general-rules/abilities">
					<RulingCrossReferences references={[]} />
				</section>
			</div>,
		)

		const links = [...screen.container.querySelectorAll('a')]
		expect(links).toHaveLength(12)

		for (const { source, question, url } of ABILITIES_REFERENCES) {
			const section = [...screen.container.querySelectorAll('section')].find(
				(element) => element.dataset.source === source,
			)
			const link = [...(section?.querySelectorAll('a') ?? [])].find(
				(element) => element.getAttribute('href') === url,
			)

			expect(link?.textContent).toBe(question)
		}

		const destination = [...screen.container.querySelectorAll('section')].find(
			(element) => element.dataset.source === '/general-rules/abilities',
		)
		expect(destination?.querySelector('nav')).toBeNull()
		expect(screen.container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
	})

	test('renders the approved Costs and Payments inventory only at its exact source answers', async () => {
		const sources = [...new Set(COSTS_REFERENCES.map(({ source }) => source))]
		const screen = await render(
			<div>
				{sources.map((source) => (
					<section key={source} data-source={source}>
						<RulingCrossReferences
							references={COSTS_REFERENCES.filter((reference) => reference.source === source).map(
								({ question, url }) => ({ type: 'canonical', question, url }),
							)}
						/>
					</section>
				))}
				<section data-source="/general-rules/costs-and-payments">
					<RulingCrossReferences references={[]} />
				</section>
			</div>,
		)

		const links = [...screen.container.querySelectorAll('a')]
		expect(links).toHaveLength(9)

		for (const { source, question, url } of COSTS_REFERENCES) {
			const section = [...screen.container.querySelectorAll('section')].find(
				(element) => element.dataset.source === source,
			)
			const link = [...(section?.querySelectorAll('a') ?? [])].find(
				(element) => element.getAttribute('href') === url,
			)

			expect(link?.textContent).toBe(question)
		}

		const heedless = [...screen.container.querySelectorAll('section')].find(
			(element) => element.dataset.source === '/cards/heedless-resurrection#ignore-additional-costs',
		)
		expect([...(heedless?.querySelectorAll('a') ?? [])].map((link) => link.textContent)).toStrictEqual([
			'What are optional additional costs?',
			'What costs still apply when I play a card ignoring one or more of its costs?',
		])

		const destination = [...screen.container.querySelectorAll('section')].find(
			(element) => element.dataset.source === '/general-rules/costs-and-payments',
		)
		expect(destination?.querySelector('nav')).toBeNull()
		expect(screen.container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
	})
})
