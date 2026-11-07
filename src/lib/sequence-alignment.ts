export type IndexAlignment =
	| { type: 'match'; leftIndex: number; rightIndex: number }
	| { type: 'left'; leftIndex: number }
	| { type: 'right'; rightIndex: number }

export function alignIndicesByScore(
	leftLength: number,
	rightLength: number,
	score: (leftIndex: number, rightIndex: number) => number,
): IndexAlignment[] {
	const matrix: Int32Array[] = Array.from({ length: leftLength + 1 }, () => new Int32Array(rightLength + 1))
	for (let leftIndex = leftLength - 1; leftIndex >= 0; leftIndex--) {
		for (let rightIndex = rightLength - 1; rightIndex >= 0; rightIndex--) {
			const matchScore = score(leftIndex, rightIndex)
			matrix[leftIndex][rightIndex] = Math.max(
				matrix[leftIndex + 1][rightIndex],
				matrix[leftIndex][rightIndex + 1],
				matchScore > 0 ? matrix[leftIndex + 1][rightIndex + 1] + matchScore : 0,
			)
		}
	}

	const alignment: IndexAlignment[] = []
	let leftIndex = 0
	let rightIndex = 0
	while (leftIndex < leftLength && rightIndex < rightLength) {
		const matchScore = score(leftIndex, rightIndex)
		if (
			matchScore > 0 &&
			matrix[leftIndex][rightIndex] === matrix[leftIndex + 1][rightIndex + 1] + matchScore
		) {
			alignment.push({ type: 'match', leftIndex: leftIndex++, rightIndex: rightIndex++ })
		} else if (matrix[leftIndex + 1][rightIndex] >= matrix[leftIndex][rightIndex + 1]) {
			alignment.push({ type: 'left', leftIndex: leftIndex++ })
		} else alignment.push({ type: 'right', rightIndex: rightIndex++ })
	}
	while (leftIndex < leftLength) alignment.push({ type: 'left', leftIndex: leftIndex++ })
	while (rightIndex < rightLength) alignment.push({ type: 'right', rightIndex: rightIndex++ })
	return alignment
}
