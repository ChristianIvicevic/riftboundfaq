type RootNode = { children: unknown[] }
type HeadingNode = {
	type: 'heading'
	depth: number
	data?: { hProperties?: { id?: unknown } }
}
function isHeading(node: unknown): node is HeadingNode {
	return typeof node === 'object' && node !== null && 'type' in node && node.type === 'heading'
}

function containsRulingCrossReferences(node: unknown): boolean {
	if (typeof node !== 'object' || node === null) return false
	if (
		'type' in node &&
		(node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
		'name' in node &&
		node.name === 'RulingCrossReferences'
	)
		return true

	return 'children' in node && Array.isArray(node.children)
		? node.children.some(containsRulingCrossReferences)
		: false
}

export function remarkRulingCrossReferences() {
	return (root: RootNode) => {
		if (root.children.some(containsRulingCrossReferences))
			throw new Error('RulingCrossReferences mounts are generated and must not be authored')

		const answerAnchors = new Set<string>()
		for (let index = 0; index < root.children.length; index += 1) {
			const heading = root.children[index]
			if (!isHeading(heading) || heading.depth !== 2) continue

			const anchor = heading.data?.hProperties?.id
			if (typeof anchor !== 'string') continue
			if (answerAnchors.has(anchor)) throw new Error(`duplicate H2 Ruling answer anchor ${anchor}`)
			answerAnchors.add(anchor)

			let answerEnd = index + 1
			while (answerEnd < root.children.length) {
				const node = root.children[answerEnd]
				if (isHeading(node) && node.depth <= 2) break
				answerEnd += 1
			}

			root.children.splice(answerEnd, 0, {
				type: 'mdxJsxFlowElement',
				name: 'RulingCrossReferences',
				attributes: [{ type: 'mdxJsxAttribute', name: 'anchor', value: anchor }],
				children: [],
			})
			index = answerEnd
		}
	}
}
