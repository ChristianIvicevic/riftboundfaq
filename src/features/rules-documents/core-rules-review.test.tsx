import { describe, expect, test } from 'vitest'
import { CoreRulesReviewError, resolveCoreRulesReview } from '@/features/rules-documents/core-rules-review'
import { UnknownRulesVersionError } from '@/features/rules-documents/registry'

describe('Core Rules review', () => {
	test('resolves an up-to-date Core Rules review for its callout and citations', () => {
		const review = resolveCoreRulesReview({
			url: '/cards/alpha-strike',
			reviewedVersion: '1.4',
		})!

		expect(review).toMatchObject({
			reviewedVersion: '1.4',
			currentVersion: '1.4',
			reviewStatus: 'up-to-date',
		})
	})

	test('keeps an outdated Core Rules review and its citations on the reviewed version', () => {
		const review = resolveCoreRulesReview({
			url: '/cards/alpha-strike',
			reviewedVersion: '1.3',
		})!

		expect(review).toMatchObject({
			reviewedVersion: '1.3',
			currentVersion: '1.4',
			reviewStatus: 'outdated',
		})
	})

	test('rejects an unknown reviewed version with page context', () => {
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
			'Core Rules review for page "/cards/alpha-strike" identifies unknown version "1.99"',
		)
	})

	test('leaves a page without a Core Rules review unchanged', () => {
		const review = resolveCoreRulesReview({ url: '/cards/alpha-strike' })

		expect(review).toBeUndefined()
	})
})
