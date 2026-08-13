import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { CoreRulesReviewCallout } from '@/components/core-rules/review-callout'
import { Rule } from '@/components/core-rules/rule'
import { resolveCoreRulesReview } from '@/features/rules-documents/core-rules-review'

describe('Core Rules review rendering', () => {
	test('renders a current review callout and interactive citation', async () => {
		const review = resolveCoreRulesReview({
			url: '/cards/alpha-strike',
			reviewedVersion: '1.4',
		})!
		const screen = await render(
			<>
				<CoreRulesReviewCallout
					currentVersion={review.currentVersion}
					reviewedVersion={review.reviewedVersion}
					status={review.status}
				/>
				<Rule document={review.document} number="355.14.a" />
			</>,
		)

		await expect.element(screen.getByText('Up-to-date:')).toBeVisible()
		await expect.element(screen.getByRole('button', { name: 'Preview rule 355.14.a' })).toBeVisible()
	})

	test('renders an archived review callout and versioned citation', async () => {
		const review = resolveCoreRulesReview({
			url: '/cards/alpha-strike',
			reviewedVersion: '1.3',
		})!
		const screen = await render(
			<>
				<CoreRulesReviewCallout
					currentVersion={review.currentVersion}
					reviewedVersion={review.reviewedVersion}
					status={review.status}
				/>
				<Rule document={review.document} number="999.999" />
			</>,
		)

		await expect.element(screen.getByText('Outdated:')).toBeVisible()
		await expect.element(screen.getByText(/version 1\.3 of the core rules document/u)).toBeVisible()
		await expect.element(screen.getByText(/Core Rules 1\.4/u)).toBeVisible()
		await expect
			.element(screen.getByRole('link', { name: '[999.999]' }))
			.toHaveAttribute('href', '/reference/core-rules/1.3#R999.999')
	})

	test('renders a passive citation without review context', async () => {
		const screen = await render(<Rule number="355.14.a" />)
		const citation = screen.getByText('[355.14.a]')

		await expect.element(citation).toBeVisible()
		expect(citation.element().tagName).toBe('SUP')
		await expect.element(citation).toHaveClass('text-nowrap', 'text-fd-muted-foreground')
	})
})
