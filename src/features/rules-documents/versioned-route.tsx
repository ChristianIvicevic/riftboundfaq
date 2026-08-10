import type { ReactNode } from 'react'
import { CoreRulesDocumentView } from '@/features/core-rules/document-view'
import {
	rulesDocuments,
	type RulesDocumentFamily,
	type RulesDocumentReference,
	type TraversedRulesDocument,
	UnknownRulesVersionError,
} from '@/features/rules-documents/registry'
import { TournamentRulesDocumentView } from '@/features/tournament-rules/document-view'
import { rulesDocumentFamily } from '@/lib/rules/document-family-conventions'

type VersionedRulesRouteErrorReason = 'route-mismatch' | 'unknown-rules-version' | 'missing-route-context'

type RulesDocumentRenderAdapter = (document: TraversedRulesDocument) => ReactNode

const RULES_DOCUMENT_RENDER_ADAPTERS = {
	'core-rules': (document) => <CoreRulesDocumentView document={document} />,
	'tournament-rules': (document) => <TournamentRulesDocumentView document={document} />,
} satisfies Record<RulesDocumentFamily, RulesDocumentRenderAdapter>

export type VersionedRulesRoute = Readonly<{
	document: TraversedRulesDocument
	toc: readonly Readonly<{
		title: string
		url: `#${string}`
		depth: 2 | 3
	}>[]
}>

export class VersionedRulesRouteError extends Error {
	constructor(
		readonly reason: VersionedRulesRouteErrorReason,
		readonly url: string | undefined,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options)
		this.name = 'VersionedRulesRouteError'
	}
}

export function resolveVersionedRulesRoute({
	url,
	rulesDocument,
}: Readonly<{
	url: string
	rulesDocument?: RulesDocumentReference
}>): VersionedRulesRoute | undefined {
	if (!rulesDocument) return

	let document: TraversedRulesDocument
	try {
		document = rulesDocuments.get(rulesDocument)
	} catch (cause) {
		if (!(cause instanceof UnknownRulesVersionError)) throw cause
		throw new VersionedRulesRouteError(
			'unknown-rules-version',
			url,
			`Versioned rules route ${JSON.stringify(url)} identifies an unknown registered rules version`,
			{ cause },
		)
	}

	const expectedUrl = rulesDocumentFamily(document.identity.type).version(document.identity.version).reference
		.documentRoute
	if (url !== expectedUrl) {
		throw new VersionedRulesRouteError(
			'route-mismatch',
			url,
			`Rules document ${rulesDocument.type} ${rulesDocument.version} must be served at ${JSON.stringify(expectedUrl)}`,
		)
	}

	return Object.freeze({
		document,
		toc: Object.freeze(
			document.navigation.map(({ id, text, anchor, depth }) =>
				Object.freeze({ title: `${id}. ${text}`, url: `#${anchor}` as const, depth }),
			),
		),
	})
}

export function renderVersionedRulesDocument(route: VersionedRulesRoute | undefined): ReactNode {
	if (!route) {
		throw new VersionedRulesRouteError(
			'missing-route-context',
			undefined,
			'<RulesDocument /> requires a resolved Versioned rules route',
		)
	}

	return RULES_DOCUMENT_RENDER_ADAPTERS[route.document.identity.type](route.document)
}
