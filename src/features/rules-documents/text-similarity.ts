const LEXICAL_TOKEN = /[\p{L}\p{N}\u200B]+/gu

type RulesTextSimilarity = Readonly<{
	sharedTokens: number
	dice: number
	lengthRatio: number
	shorterTokenCount: number
}>

export function rulesLexicalTokens(text: string) {
	return text.match(LEXICAL_TOKEN) ?? []
}

function orderedLcsLength<T>(left: readonly T[], right: readonly T[]) {
	let previous = new Int32Array(right.length + 1)
	for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex--) {
		const current = new Int32Array(right.length + 1)
		for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex--) {
			current[rightIndex] =
				left[leftIndex] === right[rightIndex]
					? previous[rightIndex + 1] + 1
					: Math.max(previous[rightIndex], current[rightIndex + 1])
		}
		previous = current
	}
	return previous[0]
}

export function measureRulesTextSimilarity(left: string, right: string): RulesTextSimilarity {
	const leftTokens = rulesLexicalTokens(left)
	const rightTokens = rulesLexicalTokens(right)
	const sharedTokens = orderedLcsLength(leftTokens, rightTokens)
	return {
		sharedTokens,
		shorterTokenCount: Math.min(leftTokens.length, rightTokens.length),
		dice:
			leftTokens.length === 0 || rightTokens.length === 0
				? 0
				: (2 * sharedTokens) / (leftTokens.length + rightTokens.length),
		lengthRatio:
			leftTokens.length === 0 || rightTokens.length === 0
				? 0
				: Math.min(leftTokens.length, rightTokens.length) / Math.max(leftTokens.length, rightTokens.length),
	}
}
