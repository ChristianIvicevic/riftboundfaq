import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { PageAttribution } from '@/app/(wiki)/[[...slug]]/_components/page-attribution'

describe('Page attribution', () => {
	test('links authors with URLs and renders other authors as plain text', async () => {
		const screen = await render(
			<PageAttribution
				authors={[
					{ name: 'Christian “Near” Ivicevic', url: 'https://x.com/civicevic' },
					{ name: 'Rules Reviewer' },
				]}
			/>,
		)

		const linkedAuthor = screen.getByRole('link', { name: 'Christian “Near” Ivicevic' })
		await expect.element(linkedAuthor).toHaveAttribute('href', 'https://x.com/civicevic')
		await expect.element(linkedAuthor).toHaveAttribute('target', '_blank')
		await expect.element(screen.getByText('Rules Reviewer', { exact: true })).toBeVisible()
		expect(screen.getByRole('link', { name: 'Rules Reviewer' }).elements()).toHaveLength(0)
		await expect
			.element(screen.getByText('Written by Christian “Near” Ivicevic and Rules Reviewer.'))
			.toBeVisible()
	})
})
