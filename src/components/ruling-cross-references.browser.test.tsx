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

const PLAYING_CARDS_REFERENCES = [
	{
		source: '/cards/abandoned-hall#countered-spell',
		question: 'What does "play" mean on a card?',
		url: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/astral-heron#trigger-timing',
		question: 'What does "play" mean on a card?',
		url: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/brynhir-thundersong#existing-cards',
		question: 'What does "play" mean on a card?',
		url: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/consuming-curse#self-count',
		question: 'When does a card leave my trash when I play it from there?',
		url: '/general-rules/playing-cards#playing-from-trash',
	},
	{
		source: '/cards/fallen-feline#existing-spells',
		question: 'What does "play" mean on a card?',
		url: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/heedless-resurrection#self-resurrection',
		question: 'What is the process for playing a card?',
		url: '/general-rules/playing-cards#play-process',
	},
	{
		source: '/cards/promising-future#brynhir-thundersong',
		question: 'What does "play" mean on a card?',
		url: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/rebuttal#back-off-draw',
		question: 'What does "play" mean on a card?',
		url: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/rebuttal#play-trigger-controller',
		question: 'What does "play" mean on a card?',
		url: '/general-rules/playing-cards#play-definition',
	},
	{
		source: '/cards/shadow-assassin#self-count',
		question: 'When does a card leave my trash when I play it from there?',
		url: '/general-rules/playing-cards#playing-from-trash',
	},
	{
		source: '/cards/shadowblade-lurker#self-count',
		question: 'When does a card leave my trash when I play it from there?',
		url: '/general-rules/playing-cards#playing-from-trash',
	},
	{
		source: '/mechanics/repeat#repeat-decision-timing',
		question: 'What is the process for playing a card?',
		url: '/general-rules/playing-cards#play-process',
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

	test('renders the approved Playing Cards inventory only at its exact source answers', async () => {
		const sources = [...new Set(PLAYING_CARDS_REFERENCES.map(({ source }) => source))]
		const screen = await render(
			<div>
				{sources.map((source) => (
					<section key={source} data-source={source}>
						<RulingCrossReferences
							references={[
								...(source === '/mechanics/repeat#repeat-decision-timing'
									? [
											{
												type: 'canonical' as const,
												question: "How is a card's total cost determined?",
												url: '/general-rules/costs-and-payments#total-cost-determination',
											},
										]
									: []),
								...PLAYING_CARDS_REFERENCES.filter((reference) => reference.source === source).map(
									({ question, url }) => ({ type: 'canonical' as const, question, url }),
								),
							]}
						/>
					</section>
				))}
				<section data-source="/general-rules/playing-cards">
					<RulingCrossReferences references={[]} />
				</section>
			</div>,
		)

		const links = [...screen.container.querySelectorAll('a')]
		expect(links).toHaveLength(13)

		for (const { source, question, url } of PLAYING_CARDS_REFERENCES) {
			const section = [...screen.container.querySelectorAll('section')].find(
				(element) => element.dataset.source === source,
			)
			const link = [...(section?.querySelectorAll('a') ?? [])].find(
				(element) => element.getAttribute('href') === url,
			)

			expect(link?.textContent).toBe(question)
		}

		const repeat = [...screen.container.querySelectorAll('section')].find(
			(element) => element.dataset.source === '/mechanics/repeat#repeat-decision-timing',
		)
		expect(repeat?.querySelectorAll('nav')).toHaveLength(1)
		expect([...(repeat?.querySelectorAll('a') ?? [])].map((link) => link.textContent)).toStrictEqual([
			"How is a card's total cost determined?",
			'What is the process for playing a card?',
		])

		for (const source of ['/cards/rebuttal#play-trigger-controller', '/cards/rebuttal#back-off-draw']) {
			const rebuttalAnswer = [...screen.container.querySelectorAll('section')].find(
				(element) => element.dataset.source === source,
			)
			expect(rebuttalAnswer?.querySelectorAll('nav')).toHaveLength(1)
			expect(rebuttalAnswer?.querySelectorAll('a')).toHaveLength(1)
		}

		const destination = [...screen.container.querySelectorAll('section')].find(
			(element) => element.dataset.source === '/general-rules/playing-cards',
		)
		expect(destination?.querySelector('nav')).toBeNull()
		expect(screen.container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
	})
})
