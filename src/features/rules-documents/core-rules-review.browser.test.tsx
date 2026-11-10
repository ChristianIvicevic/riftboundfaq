import 'tailwindcss/index.css'
import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { OutdatedCoreRulesReviewCallout } from '@/components/core-rules/review-callout'
import { CurrentCoreRulesReviewStatus } from '@/components/core-rules/review-status'
import { Rule } from '@/components/core-rules/rule'
import { resolveCoreRulesReview } from '@/features/rules-documents/core-rules-review'

describe('Core Rules review rendering', () => {
	test('renders a compact current review status and interactive citation', async () => {
		const review = resolveCoreRulesReview({
			url: '/rulings/cards/alpha-strike',
			reviewedVersion: '1.5',
		})!
		const screen = await render(
			<>
				<CurrentCoreRulesReviewStatus currentVersion={review.currentVersion} />
				<p>
					See <Rule document={review.document} number="355.14.a" /> for the rule.
				</p>
			</>,
		)
		const status = screen.getByRole('button', { name: 'Reviewed against current Core Rules 1.5' })

		await expect.element(status).toHaveTextContent('Reviewed')
		await status.click()
		await expect.element(screen.getByRole('dialog', { name: 'Current Core Rules' })).toBeVisible()
		await expect
			.element(screen.getByText('This page has been reviewed against the current Core Rules, version 1.5.'))
			.toBeVisible()
		await userEvent.keyboard('{Escape}')

		const citation = screen.getByRole('button', { name: 'Preview rule 355.14.a' })
		citation.element().focus()
		await expect.element(citation).toHaveFocus()
		await userEvent.keyboard('{Enter}')
		const ruleText = review.document.lookupText('355.14.a')
		if (!ruleText) throw new Error('Expected Core Rules 1.5 to contain rule 355.14.a')
		const ruleDialog = screen.getByRole('dialog', { name: 'Rule 355.14.a' })
		await expect.element(ruleDialog).toBeVisible()
		await expect.element(ruleDialog).toMatchTextContent(ruleText)
		await expect
			.element(screen.getByRole('link', { name: 'Open rule' }))
			.toHaveAttribute('href', '/rules-documents/core-rules/1.5#R355.14.a')
	})

	test('opens current review details on keyboard focus', async () => {
		const screen = await render(<CurrentCoreRulesReviewStatus currentVersion="1.5" />)
		const status = screen.getByRole('button', { name: 'Reviewed against current Core Rules 1.5' })

		await userEvent.tab()

		await expect.element(status).toHaveFocus()
		await expect.element(screen.getByRole('dialog', { name: 'Current Core Rules' })).toBeVisible()
	})

	test('renders an outdated review callout and version-specific citation', async () => {
		const review = resolveCoreRulesReview({
			url: '/rulings/cards/alpha-strike',
			reviewedVersion: '1.3',
		})!
		const screen = await render(
			<>
				<OutdatedCoreRulesReviewCallout
					currentVersion={review.currentVersion}
					reviewedVersion={review.reviewedVersion}
				/>
				<Rule document={review.document} number="999.999" />
			</>,
		)

		await expect.element(screen.getByText('Outdated:')).toBeVisible()
		await expect.element(screen.getByText(/reviewed against Core Rules 1\.3/u)).toBeVisible()
		await expect.element(screen.getByText(/current version \(1\.5\)/u)).toBeVisible()
		await expect
			.element(screen.getByRole('link', { name: '[999.999]' }))
			.toHaveAttribute('href', '/rules-documents/core-rules/1.3#R999.999')
	})

	test('renders a passive non-wrapping citation without review context', async () => {
		const screen = await render(<Rule number="355.14.a" />)
		const citation = screen.getByText('[355.14.a]')

		await expect.element(citation).toBeVisible()
		expect(citation.element().tagName).toBe('SUP')
		expect(citation.element().querySelector('a, button')).toBeNull()
		expect(getComputedStyle(citation.element()).whiteSpace).toBe('nowrap')
	})
})
