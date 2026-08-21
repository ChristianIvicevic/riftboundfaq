type RootNode = { children: unknown[] }
type HeadingNode = {
	type: 'heading'
	depth: number
	data?: { hProperties?: { id?: unknown } }
}

function isHeading(node: unknown): node is HeadingNode {
	return typeof node === 'object' && node !== null && 'type' in node && node.type === 'heading'
}

export function remarkRulingCrossReferences() {
	return (root: RootNode) => {
		for (let index = 0; index < root.children.length; index += 1) {
			const heading = root.children[index]
			if (!isHeading(heading) || heading.depth !== 2) continue

			const anchor = heading.data?.hProperties?.id
			if (typeof anchor !== 'string') continue

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
