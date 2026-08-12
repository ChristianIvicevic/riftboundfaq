import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { CoreRulesReviewCallout } from '@/components/core-rules/review-callout'
import { Rule } from '@/components/core-rules/rule'
import { CoreRulesReviewError, resolveCoreRulesReview } from '@/features/rules-documents/core-rules-review'
import { UnknownRulesVersionError } from '@/features/rules-documents/registry'

describe('Core Rules review', () => {
	test('resolves a Current Core Rules review for its callout and citations', () => {
		const review = resolveCoreRulesReview({
			url: '/cards/alpha-strike',
			reviewedVersion: '1.4',
		})!

		expect(review).toMatchObject({ reviewedVersion: '1.4', currentVersion: '1.4', status: 'current' })
		expect(
			renderToStaticMarkup(
				<CoreRulesReviewCallout
					currentVersion={review.currentVersion}
					reviewedVersion={review.reviewedVersion}
					status={review.status}
				/>,
			),
		).toContain('<strong>Up-to-date:</strong>')
		expect(renderToStaticMarkup(<Rule document={review.document} number="355.14.a" />)).toContain(
			'aria-label="Preview rule 355.14.a"',
		)
	})

	test('keeps an Archived Core Rules review and its citations on the same version', () => {
		const review = resolveCoreRulesReview({
			url: '/cards/alpha-strike',
			reviewedVersion: '1.3',
		})!

		expect(review).toMatchObject({ reviewedVersion: '1.3', currentVersion: '1.4', status: 'archived' })
		const callout = renderToStaticMarkup(
			<CoreRulesReviewCallout
				currentVersion={review.currentVersion}
				reviewedVersion={review.reviewedVersion}
				status={review.status}
			/>,
		)
		const citation = renderToStaticMarkup(<Rule document={review.document} number="999.999" />)

		expect(callout).toContain('<strong>Outdated:</strong>')
		expect(callout).toContain('version 1.3')
		expect(callout).toContain('Core Rules 1.4')
		expect(citation).toContain('/reference/core-rules/1.3#R999.999')
	})

	test('rejects an unknown reviewed version with Page publication context', () => {
		let error: unknown
		try {
			resolveCoreRulesReview({ url: '/cards/alpha-strike', reviewedVersion: '1.99' })
		} catch (cause) {
			error = cause
		}

		expect(error).toEqual(
			expect.objectContaining<Partial<CoreRulesReviewError>>({
				url: '/cards/alpha-strike',
				reviewedVersion: '1.99',
			}),
		)
		expect(error).toHaveProperty('cause', expect.any(UnknownRulesVersionError))
		expect(error).toHaveProperty(
			'message',
			'Core Rules review for Page publication "/cards/alpha-strike" identifies unknown version "1.99"',
		)
	})

	test('leaves a Page publication without a Core Rules review unchanged', () => {
		const review = resolveCoreRulesReview({ url: '/cards/alpha-strike' })

		expect(review).toBeUndefined()
		expect(renderToStaticMarkup(<Rule number="355.14.a" />)).toBe(
			'<sup class="text-nowrap text-fd-muted-foreground">[355.14.a]</sup>',
		)
	})
})
