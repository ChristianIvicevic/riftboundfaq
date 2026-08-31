import { expect, test } from '@playwright/test'
import { z } from 'zod'

const searchResult = z.object({
	type: z.string(),
	content: z.string(),
	url: z.string(),
})

const cases = [
	{
		name: 'cards and energy',
		query: 'Fizz Trickster',
		urlPrefix: '/general-rules/costs-and-payments#',
		marker: 'Fizz, Trickster',
		expectedContent: ['Fizz, Trickster', '[0]'],
	},
	{
		name: 'game terms and universal power',
		query: 'Power Empowered',
		urlPrefix: '/general-rules/costs-and-payments#',
		marker: '[1][Power]',
		expectedContent: ['[1][Power]', '[Empowered]'],
	},
	{
		name: 'aliased game-term labels',
		query: 'Quick-Draw',
		urlPrefix: '/mechanics/equipment#',
		marker: '[Quick-Draw]',
		expectedContent: ['[Quick-Draw]'],
	},
	{
		name: 'runes',
		query: 'Fury Ezreal',
		urlPrefix: '/cards/ezreal-prodigy#',
		marker: '[1][Fury]',
		expectedContent: ['[1][Fury]', '[Repeat]'],
	},
] as const

function withoutHighlights(content: string) {
	return content.replaceAll('<mark>', '').replaceAll('</mark>', '')
}

test.describe('custom MDX search indexing', () => {
	for (const testCase of cases) {
		test(`indexes ${testCase.name}`, async ({ request }) => {
			const response = await request.get(`/api/search?query=${encodeURIComponent(testCase.query)}`)
			expect(response.ok()).toBe(true)
			const parsedResults = z.array(searchResult).safeParse(await response.json())
			if (!parsedResults.success) throw parsedResults.error

			const result = parsedResults.data.find(
				(item) =>
					item.type === 'text' &&
					item.url.startsWith(testCase.urlPrefix) &&
					withoutHighlights(item.content).includes(testCase.marker),
			)
			expect(result).toBeDefined()

			const content = withoutHighlights(result?.content ?? '')
			for (const expectedContent of testCase.expectedContent) {
				expect(content).toContain(expectedContent)
			}
		})
	}
})
