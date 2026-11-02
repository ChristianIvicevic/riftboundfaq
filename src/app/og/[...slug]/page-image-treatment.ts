import { TERM_DEFINITIONS, type TermVariant } from '@/lib/mdx-vocabulary'
import { coreRulesConventions, tournamentRulesConventions } from '@/lib/rules/document-family-conventions'
import rulesManifest from '../../../../sources/rules-manifest.json'

type PageImagePage = {
	url: string
	data: { title: string }
}

type KeywordStyle = {
	backgroundColor: string
	textColor: string
	accentColor: string
	fontSize: string
}

export type PageImageTreatment =
	| {
			kind: 'landing'
			displayTitle?: string
			displayDescription?: string
	  }
	| { kind: 'editorial' }
	| {
			kind: 'index-cover'
			eyebrow: string
			coverPrimary?: string
			coverAccent: string
			coverAccentFontSize: string
	  }
	| { kind: 'card' }
	| { kind: 'mechanic-keyword'; keyword: KeywordStyle }
	| { kind: 'mechanic-topic' }
	| { kind: 'general-rules' }
	| {
			kind: 'rules-reference'
			displayTitle?: string
			cover: {
				documentLabel: string
				versionLabel: string
				editionLabel: string
				versionFontSize: string
			}
	  }
	| {
			kind: 'rules-diff'
			displayTitle?: string
			transition: {
				documentLabel: string
				fromLabel: string
				toLabel: string
				fromFontSize: string
				toFontSize: string
				titleFontSize: string
			}
	  }

const KEYWORD_STYLES: Record<TermVariant, Omit<KeywordStyle, 'fontSize'>> = {
	primary: { backgroundColor: '#107361', textColor: '#ffffff', accentColor: '#3fae91' },
	secondary: { backgroundColor: '#95b229', textColor: '#090909', accentColor: '#b8d343' },
	accent: { backgroundColor: '#cc366b', textColor: '#ffffff', accentColor: '#e36d97' },
	tertiary: { backgroundColor: '#6b6b6b', textColor: '#ffffff', accentColor: '#9a9a9a' },
}

const TERM_DEFINITION_VALUES = Object.values(TERM_DEFINITIONS)
const CORE_RULES_VERSIONS: Record<string, { name?: string }> = rulesManifest.coreRules.versions
const CORE_RULES_VERSION_KEYS = Object.keys(CORE_RULES_VERSIONS).toSorted(
	coreRulesConventions.compareVersions,
)
const TOURNAMENT_RULES_VERSIONS = Object.keys(rulesManifest.tournamentRules.versions).toSorted(
	tournamentRulesConventions.compareVersions,
)

function keywordFontSize(label: string) {
	if (label.length <= 4) return '92px'
	if (label.length <= 6) return '82px'
	if (label.length <= 8) return '72px'
	if (label.length <= 10) return '64px'
	return '54px'
}

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
	if (page.url === '/card-errata-list') {
		return {
			kind: 'index-cover',
			eyebrow: 'REFERENCE',
			coverAccent: 'ERRATA',
			coverAccentFontSize: '88px',
		}
	}
	if (page.url === '/reference') {
		return {
			kind: 'index-cover',
			eyebrow: 'RULES REFERENCE',
			coverPrimary: 'RULES',
			coverAccent: 'DOCUMENTS',
			coverAccentFontSize: '52px',
		}
	}

	if (page.url.startsWith('/cards/')) return { kind: 'card' }
	if (page.url.startsWith('/general-rules/')) return { kind: 'general-rules' }
	if (page.url.startsWith('/mechanics/')) {
		const definition = TERM_DEFINITION_VALUES.find(({ label }) => label === page.data.title)
		if (!definition) return { kind: 'mechanic-topic' }
		return {
			kind: 'mechanic-keyword',
			keyword: {
				...KEYWORD_STYLES[definition.variant],
				fontSize: keywordFontSize(definition.label),
			},
		}
	}

	const coreRulesDiff = /^\/reference\/core-rules\/changes\/([^/]+)$/u.exec(page.url)
	if (coreRulesDiff?.[1]) {
		const to = coreRulesDiff[1]
		if (!CORE_RULES_VERSIONS[to]) throw new Error(`Unregistered Core Rules version ${JSON.stringify(to)}`)
		const from = previousVersion(CORE_RULES_VERSION_KEYS, to, 'Core Rules')
		return {
			kind: 'rules-diff',
			transition: {
				documentLabel: 'CORE RULES',
				fromLabel: from,
				toLabel: to,
				fromFontSize: '126px',
				toFontSize: '150px',
				titleFontSize: '58px',
			},
		}
	}

	const coreRulesReference = /^\/reference\/core-rules\/([^/]+)$/u.exec(page.url)
	if (coreRulesReference?.[1]) {
		const version = coreRulesReference[1]
		const registered = CORE_RULES_VERSIONS[version]
		if (!registered) throw new Error(`Unregistered Core Rules version ${JSON.stringify(version)}`)
		return {
			kind: 'rules-reference',
			cover: {
				documentLabel: 'CORE RULES',
				versionLabel: version,
				editionLabel: (registered.name ?? version).toUpperCase(),
				versionFontSize: '190px',
			},
		}
	}

	const tournamentRulesDiff = /^\/reference\/tournament-rules\/changes\/([^/]+)$/u.exec(page.url)
	if (tournamentRulesDiff?.[1]) {
		const to = tournamentRulesDiff[1]
		const from = previousVersion(TOURNAMENT_RULES_VERSIONS, to, 'Tournament Rules')
		const fromLabels = tournamentVersionLabels(from)
		const toLabels = tournamentVersionLabels(to)
		return {
			kind: 'rules-diff',
			displayTitle: `Tournament Rules Changes (${toLabels.month} ${toLabels.year})`,
			transition: {
				documentLabel: 'TOURNAMENT RULES',
				fromLabel: `${fromLabels.shortMonth} ${fromLabels.year}`,
				toLabel: `${toLabels.shortMonth} ${toLabels.year}`,
				fromFontSize: '64px',
				toFontSize: '72px',
				titleFontSize: '52px',
			},
		}
	}

	const tournamentRulesReference = /^\/reference\/tournament-rules\/([^/]+)$/u.exec(page.url)
	if (tournamentRulesReference?.[1]) {
		const labels = tournamentVersionLabels(tournamentRulesReference[1])
		return {
			kind: 'rules-reference',
			displayTitle: `Tournament Rules (${labels.month} ${labels.year})`,
			cover: {
				documentLabel: 'TOURNAMENT RULES',
				versionLabel: labels.month.toUpperCase(),
				editionLabel: labels.year,
				versionFontSize: labels.month.length > 7 ? '58px' : '68px',
			},
		}
	}

	throw new Error(`Unclassified page image ${JSON.stringify(page.url)}`)
}

export function getPageImageDisplayTitle(page: PageImagePage, treatment: PageImageTreatment) {
	return 'displayTitle' in treatment && treatment.displayTitle ? treatment.displayTitle : page.data.title
}
