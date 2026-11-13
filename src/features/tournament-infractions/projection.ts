import { Data, Result } from 'effect'
import type { CompiledRulesDocument, TraversedRule } from '@/features/rules-documents/family-catalog'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

const REQUIRED_CATEGORY_IDS = ['702', '703', '704'] as const
const REQUIRED_CATEGORY_ID_SET = new Set<string>(REQUIRED_CATEGORY_IDS)
const FIXED_PENALTIES = ['No Penalty', 'Warning', 'Game Loss', 'Match Loss', 'Disqualification'] as const
const FIXED_PENALTY_SET = new Set<string>(FIXED_PENALTIES)
const INFRACTION_HEADER = /^([^[\]:]+?)(?: \[([^[\]]+)\])?: ?(.*)$/u
const SAFE_SOURCE_FRAGMENT = /^R[1-9]\d*(?:\.[1-9]\d*)*$/u
const BRACKETED_LABEL = /\[([^[\]]+)\]/gu
const CONDITIONAL_PENALTY_BRANCH = /(?:^|[.!?]\s+)(?:If\b|Otherwise\b)[^.!?]*?\[([^[\]]+)\]/giu

export type TournamentInfractionPenalty = (typeof FIXED_PENALTIES)[number] | 'Conditional'

export type TournamentInfractionRule = Readonly<{
	id: string | null
	label: string | null
	anchor: string
	content: readonly RulesDocumentContent[]
	children: readonly TournamentInfractionRule[]
}>

export type TournamentInfraction = Readonly<{
	id: string
	anchor: string
	name: string
	penalty: TournamentInfractionPenalty
	definition: string | null
	details: TournamentInfractionRule
}>

export type TournamentInfractionCategory = Readonly<{
	id: string
	anchor: string
	name: string
	infractions: readonly TournamentInfraction[]
}>

export type TournamentInfractionsIndex = Readonly<{
	version: string
	categories: readonly TournamentInfractionCategory[]
}>

export class TournamentInfractionsProjectionError extends Data.TaggedError(
	'TournamentInfractionsProjectionError',
)<{
	readonly version: string
	readonly categoryId: string
	readonly ruleId?: string
	readonly reason: string
	readonly message: string
}> {}

function projectionError(
	document: CompiledRulesDocument,
	categoryId: string,
	reason: string,
	ruleId?: string,
) {
	const context = `Tournament Rules ${document.identity.version}, category ${categoryId}${ruleId ? `, rule ${ruleId}` : ''}`
	return new TournamentInfractionsProjectionError({
		version: document.identity.version,
		categoryId,
		ruleId,
		reason,
		message: `${context}: ${reason}`,
	})
}

function isFixedPenalty(value: string): value is (typeof FIXED_PENALTIES)[number] {
	return FIXED_PENALTY_SET.has(value)
}

function descendantBracketedLabels(rule: TraversedRule): string[] {
	return rule.children.flatMap((child) => [
		...child.content.flatMap(({ text }) => [...text.matchAll(BRACKETED_LABEL)].map((match) => match[1]!)),
		...descendantBracketedLabels(child),
	])
}

function descendantConditionalPenaltyLabels(rule: TraversedRule): string[] {
	return rule.children.flatMap((child) => [
		...child.content.flatMap(({ text }) =>
			[...text.matchAll(CONDITIONAL_PENALTY_BRANCH)].map((match) => match[1]!),
		),
		...descendantConditionalPenaltyLabels(child),
	])
}

function projectInfractionRule(rule: TraversedRule): TournamentInfractionRule {
	return {
		id: rule.id,
		label: rule.label,
		anchor: rule.anchor,
		content: rule.content.map(({ kind, text }) => ({ kind, text })),
		children: rule.children.map(projectInfractionRule),
	}
}

function projectedRuleMismatch(
	source: TraversedRule,
	projected: TournamentInfractionRule,
): string | undefined {
	if (source.id !== projected.id || source.label !== projected.label || source.anchor !== projected.anchor) {
		return `detail projection changed source identity at anchor ${JSON.stringify(source.anchor)}`
	}
	if (source.content.length !== projected.content.length) {
		return `detail projection dropped content at anchor ${JSON.stringify(source.anchor)}`
	}
	for (const [index, sourceContent] of source.content.entries()) {
		const projectedContent = projected.content[index]
		if (projectedContent?.kind !== sourceContent.kind || projectedContent.text !== sourceContent.text) {
			return `detail projection changed or reordered content at anchor ${JSON.stringify(source.anchor)}`
		}
	}
	if (source.children.length !== projected.children.length) {
		return `detail projection dropped descendants at anchor ${JSON.stringify(source.anchor)}`
	}
	for (const [index, sourceChild] of source.children.entries()) {
		const projectedChild = projected.children[index]
		if (!projectedChild) {
			return `detail projection dropped descendants at anchor ${JSON.stringify(source.anchor)}`
		}
		const mismatch = projectedRuleMismatch(sourceChild, projectedChild)
		if (mismatch) return mismatch
	}
	return undefined
}

export function projectTournamentInfractions(
	document: CompiledRulesDocument,
): Result.Result<TournamentInfractionsIndex, TournamentInfractionsProjectionError> {
	return Result.gen(function* () {
		const enforcementSections = document.sections.filter(({ heading }) => heading.id === '700')
		if (enforcementSections.length !== 1) {
			return yield* Result.fail(
				projectionError(
					document,
					REQUIRED_CATEGORY_IDS[0],
					'Tournament Rules section 700 must exist exactly once',
				),
			)
		}
		const subsectionBlocks = enforcementSections[0].blocks.flatMap((block) =>
			block.kind === 'subsection' ? [block] : [],
		)
		const categories: TournamentInfractionCategory[] = []
		const infractionIds = new Set<string>()
		const fragments = new Set<string>()

		for (const categoryId of REQUIRED_CATEGORY_IDS) {
			const matches = subsectionBlocks.filter(({ heading }) => heading.id === categoryId)
			if (matches.length === 0) {
				return yield* Result.fail(
					projectionError(document, categoryId, 'required infraction category is missing'),
				)
			}
			if (matches.length > 1) {
				return yield* Result.fail(
					projectionError(document, categoryId, 'required infraction category is ambiguous'),
				)
			}
		}

		const categoryBlocks = subsectionBlocks.filter(({ heading }) => REQUIRED_CATEGORY_ID_SET.has(heading.id))
		for (const block of categoryBlocks) {
			const categoryId = block.heading.id
			if (!block.heading.text.trim() || !block.heading.anchor) {
				return yield* Result.fail(
					projectionError(document, categoryId, 'infraction category heading is malformed'),
				)
			}
			if (fragments.has(block.heading.anchor)) {
				return yield* Result.fail(
					projectionError(
						document,
						categoryId,
						`duplicate infraction category fragment ${JSON.stringify(block.heading.anchor)}`,
					),
				)
			}
			if (!SAFE_SOURCE_FRAGMENT.test(block.heading.anchor) || block.heading.anchor !== `R${categoryId}`) {
				return yield* Result.fail(
					projectionError(
						document,
						categoryId,
						`unsafe infraction category fragment ${JSON.stringify(block.heading.anchor)}`,
					),
				)
			}
			fragments.add(block.heading.anchor)
			const overviewId = `${categoryId}.1`
			const overview = block.rules[0]
			const overviewOccurrences = block.rules.filter(({ id }) => id === overviewId).length
			if (
				overviewOccurrences !== 1 ||
				overview?.id !== overviewId ||
				overview.label !== `${overviewId}.` ||
				overview.content.length !== 1 ||
				overview.content[0]?.kind !== 'paragraph' ||
				overview.content[0].text !== 'Overview'
			) {
				return yield* Result.fail(
					projectionError(
						document,
						categoryId,
						'category overview must be the first rule and contain only Overview',
						overviewId,
					),
				)
			}
			const infractions: TournamentInfraction[] = []
			for (const rule of block.rules.slice(1)) {
				const immediateNumericId = new RegExp(`^${categoryId}\\.[1-9]\\d*$`, 'u')
				if (rule.id === null || !immediateNumericId.test(rule.id) || rule.label !== `${rule.id}.`) {
					return yield* Result.fail(
						projectionError(
							document,
							categoryId,
							'top-level infraction must have an immediate numeric rule identifier and matching label',
							rule.id ?? undefined,
						),
					)
				}
				if (infractionIds.has(rule.id)) {
					return yield* Result.fail(
						projectionError(
							document,
							categoryId,
							`duplicate infraction identifier ${JSON.stringify(rule.id)}`,
							rule.id,
						),
					)
				}
				if (fragments.has(rule.anchor)) {
					return yield* Result.fail(
						projectionError(
							document,
							categoryId,
							`duplicate infraction fragment ${JSON.stringify(rule.anchor)}`,
							rule.id,
						),
					)
				}
				if (!SAFE_SOURCE_FRAGMENT.test(rule.anchor) || rule.anchor !== `R${rule.id}`) {
					return yield* Result.fail(
						projectionError(
							document,
							categoryId,
							`unsafe infraction fragment ${JSON.stringify(rule.anchor)}`,
							rule.id,
						),
					)
				}
				infractionIds.add(rule.id)
				fragments.add(rule.anchor)

				const content = rule.content[0]
				if (rule.content.length !== 1 || content?.kind !== 'paragraph') {
					return yield* Result.fail(
						projectionError(document, categoryId, 'infraction header must contain one paragraph', rule.id),
					)
				}
				const header = INFRACTION_HEADER.exec(content.text)
				const name = header?.[1]?.trim()
				if (!header || !name || name !== header[1]) {
					return yield* Result.fail(
						projectionError(
							document,
							categoryId,
							'infraction header must contain one official name, optional fixed penalty, and colon',
							rule.id,
						),
					)
				}
				const declaredPenalty = header[2]
				if (declaredPenalty !== undefined && !isFixedPenalty(declaredPenalty)) {
					return yield* Result.fail(
						projectionError(
							document,
							categoryId,
							`unknown fixed penalty ${JSON.stringify(declaredPenalty)}`,
							rule.id,
						),
					)
				}
				let penalty: TournamentInfractionPenalty = declaredPenalty ?? 'Conditional'
				if (declaredPenalty === undefined) {
					const descendantLabels = descendantBracketedLabels(rule)
					const unknownPenalty = descendantLabels.find((label) => !isFixedPenalty(label))
					if (unknownPenalty !== undefined) {
						return yield* Result.fail(
							projectionError(
								document,
								categoryId,
								`Conditional descendant uses unknown penalty ${JSON.stringify(unknownPenalty)}`,
								rule.id,
							),
						)
					}
					const outcomes = new Set(
						descendantConditionalPenaltyLabels(rule).filter((label) => isFixedPenalty(label)),
					)
					if (outcomes.size < 2) {
						return yield* Result.fail(
							projectionError(
								document,
								categoryId,
								'Conditional requires at least two distinct recognized descendant penalties',
								rule.id,
							),
						)
					}
					penalty = 'Conditional'
				}
				const definition = header[3]
				const details = projectInfractionRule(rule)
				const detailMismatch = projectedRuleMismatch(rule, details)
				if (detailMismatch) {
					return yield* Result.fail(projectionError(document, categoryId, detailMismatch, rule.id))
				}
				infractions.push({
					id: rule.id,
					anchor: rule.anchor,
					name,
					penalty,
					definition: definition ? definition : null,
					details,
				})
			}
			categories.push({
				id: categoryId,
				anchor: block.heading.anchor,
				name: block.heading.text,
				infractions,
			})
		}

		return { version: document.identity.version, categories }
	})
}
