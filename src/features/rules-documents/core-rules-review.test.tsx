import { describe, expect, test } from 'vitest'
import { CoreRulesReviewError, resolveCoreRulesReview } from '@/features/rules-documents/core-rules-review'
import { UnknownRulesVersionError } from '@/features/rules-documents/registry'

describe('Core Rules review', () => {
	test('resolves the current registered review version', () => {
		const review = resolveCoreRulesReview({
			url: '/rulings/cards/alpha-strike',
			reviewedVersion: '1.5',
		})!

		expect(review).toMatchObject({
			reviewedVersion: '1.5',
			currentVersion: '1.5',
			reviewStatus: 'up-to-date',
			document: { identity: { version: '1.5' } },
		})
	})

	test('keeps an archived review on its registered document version', () => {
		const review = resolveCoreRulesReview({
			url: '/rulings/cards/alpha-strike',
			reviewedVersion: '1.3',
		})!

		expect(review).toMatchObject({
			reviewedVersion: '1.3',
			currentVersion: '1.5',
			reviewStatus: 'outdated',
			document: { identity: { version: '1.3' } },
		})
	})

	test('rejects an unknown reviewed version with page context', () => {
		let error: unknown
		try {
			resolveCoreRulesReview({ url: '/rulings/cards/alpha-strike', reviewedVersion: '1.99' })
		} catch (cause) {
			error = cause
		}

		expect(error).toEqual(
			expect.objectContaining<Partial<CoreRulesReviewError>>({
				url: '/rulings/cards/alpha-strike',
				reviewedVersion: '1.99',
			}),
		)
		expect(error).toHaveProperty('cause', expect.any(UnknownRulesVersionError))
		expect(error).toHaveProperty(
			'message',
			'Core Rules review for page "/rulings/cards/alpha-strike" identifies unknown version "1.99"',
		)
	})

	test('leaves a page without a Core Rules review unchanged', () => {
		const review = resolveCoreRulesReview({ url: '/rulings/cards/alpha-strike' })

		expect(review).toBeUndefined()
	})
})
