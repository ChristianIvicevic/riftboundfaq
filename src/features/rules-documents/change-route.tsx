import type { ReactNode } from 'react'
import { ContextualRulesChangeDocument } from '@/components/rules/contextual-change-document'
import {
	prepareContextualRulesChange,
	type ContextualChangeNode,
	type ContextualRulesChange,
} from '@/features/rules-documents/contextual-change'
import { rulesDocuments } from '@/features/rules-documents/registry'
import { rulesDocumentFamily, type RulesDocumentFamilyId } from '@/lib/rules/document-family-conventions'

type RulesChangeRouteErrorReason = 'missing-route-context' | 'route-mismatch'

type RulesChangePageReference = Readonly<{
	type: RulesDocumentFamilyId
	from: string
	to: string
}>

export type ResolvedRulesChangePage = RulesChangePageReference &
	Readonly<{
		change: ContextualRulesChange
		toc: readonly Readonly<{
			title: string
			url: `#${string}`
			depth: 2 | 3
		}>[]
	}>

export class RulesChangeRouteError extends Error {
	constructor(
		readonly reason: RulesChangeRouteErrorReason,
		readonly url: string | undefined,
		message: string,
	) {
		super(message)
		this.name = 'RulesChangeRouteError'
	}
}

function headingTitle(node: ContextualChangeNode) {
	const text = node.content[0]?.text
		.filter(({ type }) => type !== 'remove')
		.map(({ text: segment }) => segment)
		.join('')
	return [node.label, text].filter(Boolean).join(' ')
}

function changeToc(change: ContextualRulesChange) {
	const toc: ResolvedRulesChangePage['toc'][number][] = []
	const append = (nodes: readonly ContextualChangeNode[]) => {
		for (const node of nodes) {
			if (node.kind === 'heading') {
				if (node.headingDepth === undefined) {
					throw new Error(`Contextual rules heading ${JSON.stringify(node.anchor)} has no depth`)
				}
				toc.push({ title: headingTitle(node), url: `#${node.anchor}`, depth: node.headingDepth })
			}
			append(node.children)
		}
	}
	append(change.items)
	return toc
}

function resolveFamilyChangeRoute(url: string, type: RulesDocumentFamilyId) {
	const catalog = rulesDocuments.family(type)
	for (let index = 1; index < catalog.registeredVersions.length; index++) {
		const from = catalog.registeredVersions[index - 1].version
		const to = catalog.registeredVersions[index].version
		if (rulesDocumentFamily(type).version(to).reference.changeRoute !== url) continue
		const change = prepareContextualRulesChange(catalog, { from, to })
		return Object.freeze({ type, from, to, change, toc: Object.freeze(changeToc(change)) })
	}
}

export function resolveRulesChangeRoute(url: string): ResolvedRulesChangePage | undefined {
	for (const type of ['core-rules', 'tournament-rules'] as const) {
		const page = resolveFamilyChangeRoute(url, type)
		if (page) return page
	}
}

export function renderRulesChange(
	page: ResolvedRulesChangePage | undefined,
	reference: RulesChangePageReference,
): ReactNode {
	if (!page) {
		throw new RulesChangeRouteError(
			'missing-route-context',
			undefined,
			`<${reference.type === 'core-rules' ? 'CoreRulesDiff' : 'TournamentRulesDiff'} /> requires a resolved rules changes page`,
		)
	}
	if (page.type !== reference.type || page.from !== reference.from || page.to !== reference.to) {
		throw new RulesChangeRouteError(
			'route-mismatch',
			rulesDocumentFamily(page.type).version(page.to).reference.changeRoute,
			`Rules changes page context ${page.type} ${page.from} to ${page.to} does not match the rendered ${reference.type} ${reference.from} to ${reference.to}`,
		)
	}

	return <ContextualRulesChangeDocument data={page.change} family={page.type} />
}
