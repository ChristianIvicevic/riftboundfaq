import { expect, test } from '@playwright/test'
import { z } from 'zod'

const searchResult = z.object({
	type: z.string(),
	content: z.string(),
	url: z.string(),
})

function withoutHighlights(content: string) {
	return content.replaceAll('<mark>', '').replaceAll('</mark>', '')
}

test.describe('custom MDX search indexing', () => {
	test('serves rendered card and resource prose from the deployed search index', async ({ request }) => {
		const response = await request.get('/api/search?query=Fizz%20Trickster')
		expect(response.ok()).toBe(true)
		const parsedResults = z.array(searchResult).safeParse(await response.json())
		if (!parsedResults.success) throw parsedResults.error

		const result = parsedResults.data.find((item) => {
			const content = withoutHighlights(item.content)
			return (
				item.type === 'text' &&
				item.url.startsWith('/rulings/general-rules/costs-and-payments#') &&
				content.includes('Fizz, Trickster')
			)
		})

		expect(result).toBeDefined()
		expect(withoutHighlights(result?.content ?? '')).toContain('[0]')
	})
})
