import { CARD_TEXT_UPDATES_PATH, RULING_PATH_PREFIXES } from '@/lib/content/ruling-routes'
import { TERM_DEFINITIONS, type TermVariant } from '@/lib/mdx-vocabulary'
import { coreRulesConventions, tournamentRulesConventions } from '@/lib/rules/document-family-conventions'
import rulesManifest from '../../../../sources/rules-manifest.json'

type PageImagePage = {
	url: string
	data: { title: string }
}

type KeywordStyle = {
	backgroundColor: string
	accentColor: string
}

export type PageImageTreatment =
	| {
			kind: 'landing'
			displayTitle?: string
			displayDescription?: string
	  }
	| { kind: 'editorial' }
	| { kind: 'index-cover' }
	| { kind: 'card' }
	| { kind: 'mechanic-keyword'; keyword: KeywordStyle }
	| { kind: 'mechanic-topic' }
	| { kind: 'general-rules' }
	| {
			kind: 'rules-reference'
			displayTitle?: string
			cover:
				| { kind: 'core-rules'; versionLabel: string; editionName: string }
				| {
						kind: 'generic'
						documentLabel: string
						versionLabel: string
						editionLabel: string
				  }
	  }
	| {
			kind: 'rules-diff'
			displayTitle?: string
			transition:
				| {
						kind: 'core-rules'
						fromLabel: string
						toLabel: string
						fromEditionName: string
						toEditionName: string
				  }
				| {
						kind: 'generic'
						documentLabel: string
						fromLabel: string
						toLabel: string
				  }
	  }

const KEYWORD_STYLES: Record<TermVariant, KeywordStyle> = {
	primary: { backgroundColor: '#107361', accentColor: '#3fae91' },
	secondary: { backgroundColor: '#95b229', accentColor: '#b8d343' },
	accent: { backgroundColor: '#cc366b', accentColor: '#e36d97' },
	tertiary: { backgroundColor: '#6b6b6b', accentColor: '#9a9a9a' },
}

const TERM_DEFINITION_VALUES = Object.values(TERM_DEFINITIONS)
const CORE_RULES_VERSIONS: Record<string, { name?: string }> = rulesManifest.coreRules.versions
const CORE_RULES_VERSION_KEYS = Object.keys(CORE_RULES_VERSIONS).toSorted(
	coreRulesConventions.compareVersions,
)
const TOURNAMENT_RULES_VERSIONS = Object.keys(rulesManifest.tournamentRules.versions).toSorted(
	tournamentRulesConventions.compareVersions,
)

function previousVersion(versions: readonly string[], to: string, family: string) {
	const index = versions.indexOf(to)
	if (index <= 0) throw new Error(`Cannot resolve previous ${family} version for ${JSON.stringify(to)}`)
	return versions[index - 1]
}

function tournamentVersionLabels(version: string) {
	if (!TOURNAMENT_RULES_VERSIONS.includes(version)) {
		throw new Error(`Unregistered Tournament Rules version ${JSON.stringify(version)}`)
	}

	const date = new Date(`${version}T00:00:00Z`)
	const year = date.getUTCFullYear().toString()
	const month = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(date)
	const shortMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
		.format(date)
		.toUpperCase()
	return { year, month, shortMonth }
}

export function resolvePageImageTreatment(page: PageImagePage): PageImageTreatment {
	if (page.url === '/') {
		return {
			kind: 'landing',
			displayTitle: 'Rulings and Rules References',
			displayDescription:
				'Unofficial rulings, rules references, and card errata for Riftbound players and judges.',
		}
	}

	if (page.url === '/about-riftbound-faq') return { kind: 'landing' }
	if (page.url === '/the-future-of-riftbound-faq') return { kind: 'editorial' }
	if (
		page.url === CARD_TEXT_UPDATES_PATH ||
		page.url === '/rules-documents' ||
		page.url === '/rules-documents/tournament-infractions'
	) {
		return { kind: 'index-cover' }
	}

	if (page.url.startsWith(RULING_PATH_PREFIXES.cards)) return { kind: 'card' }
	if (page.url.startsWith(RULING_PATH_PREFIXES.generalRules)) return { kind: 'general-rules' }
	if (page.url.startsWith(RULING_PATH_PREFIXES.mechanics)) {
		const definition = TERM_DEFINITION_VALUES.find(({ label }) => label === page.data.title)
		if (!definition) return { kind: 'mechanic-topic' }
		return {
			kind: 'mechanic-keyword',
			keyword: KEYWORD_STYLES[definition.variant],
		}
	}

	const coreRulesDiff = /^\/rules-documents\/core-rules\/changes\/([^/]+)$/u.exec(page.url)
	if (coreRulesDiff?.[1]) {
		const to = coreRulesDiff[1]
		if (!CORE_RULES_VERSIONS[to]) throw new Error(`Unregistered Core Rules version ${JSON.stringify(to)}`)
		const from = previousVersion(CORE_RULES_VERSION_KEYS, to, 'Core Rules')
		return {
			kind: 'rules-diff',
			transition: {
				kind: 'core-rules',
				fromLabel: from,
				toLabel: to,
				fromEditionName: CORE_RULES_VERSIONS[from]?.name ?? from,
				toEditionName: CORE_RULES_VERSIONS[to]?.name ?? to,
			},
		}
	}

	const coreRulesReference = /^\/rules-documents\/core-rules\/([^/]+)$/u.exec(page.url)
	if (coreRulesReference?.[1]) {
		const version = coreRulesReference[1]
		const registered = CORE_RULES_VERSIONS[version]
		if (!registered) throw new Error(`Unregistered Core Rules version ${JSON.stringify(version)}`)
		return {
			kind: 'rules-reference',
			cover: {
				kind: 'core-rules',
				versionLabel: version,
				editionName: registered.name ?? version,
			},
		}
	}

	const tournamentRulesDiff = /^\/rules-documents\/tournament-rules\/changes\/([^/]+)$/u.exec(page.url)
	if (tournamentRulesDiff?.[1]) {
		const to = tournamentRulesDiff[1]
		const from = previousVersion(TOURNAMENT_RULES_VERSIONS, to, 'Tournament Rules')
		const fromLabels = tournamentVersionLabels(from)
		const toLabels = tournamentVersionLabels(to)
		return {
			kind: 'rules-diff',
			displayTitle: `Tournament Rules Changes (${toLabels.month} ${toLabels.year})`,
			transition: {
				kind: 'generic',
				documentLabel: 'TOURNAMENT RULES',
				fromLabel: `${fromLabels.shortMonth} ${fromLabels.year}`,
				toLabel: `${toLabels.shortMonth} ${toLabels.year}`,
			},
		}
	}

	const tournamentRulesReference = /^\/rules-documents\/tournament-rules\/([^/]+)$/u.exec(page.url)
	if (tournamentRulesReference?.[1]) {
		const labels = tournamentVersionLabels(tournamentRulesReference[1])
		return {
			kind: 'rules-reference',
			displayTitle: `Tournament Rules (${labels.month} ${labels.year})`,
			cover: {
				kind: 'generic',
				documentLabel: 'TOURNAMENT RULES',
				versionLabel: labels.month.toUpperCase(),
				editionLabel: labels.year,
			},
		}
	}

	throw new Error(`Unclassified page image ${JSON.stringify(page.url)}`)
}

export function getPageImageDisplayTitle(page: PageImagePage, treatment: PageImageTreatment) {
	return 'displayTitle' in treatment && treatment.displayTitle ? treatment.displayTitle : page.data.title
}
