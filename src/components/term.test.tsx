import { describe, expect, test } from 'vitest'
import { Term } from '@/components/term'

describe('Term', () => {
	test('rejects multiple child nodes', () => {
		expect(() => Term({ item: 'finalization', children: ['final', 'ized'] })).toThrow(
			'Term requires one non-empty text child',
		)
	})

	test('rejects empty text', () => {
		expect(() => Term({ item: 'cleanup', children: '   ' })).toThrow('Term requires one non-empty text child')
	})
})
