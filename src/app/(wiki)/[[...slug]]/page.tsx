import { DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CopyableDocsBody } from '@/app/(wiki)/[[...slug]]/_components/copyable-docs-body'
import { PageActions } from '@/app/(wiki)/[[...slug]]/_components/page-actions'
import { PageAttribution } from '@/app/(wiki)/[[...slug]]/_components/page-attribution'
import { RelatedRulings } from '@/app/(wiki)/[[...slug]]/_components/related-rulings'
import { CoreRulesReviewCallout } from '@/components/core-rules/review-callout'
import { getCoreRulesDocument } from '@/features/core-rules/documents'
import { createCoreRulesNavigation } from '@/features/core-rules/navigation'
import { submitPageFeedback } from '@/features/feedback/actions'
import { Feedback } from '@/features/feedback/feedback'
import { getTournamentRulesDocument } from '@/features/tournament-rules/documents'
import { createTournamentRulesNavigation } from '@/features/tournament-rules/navigation'
import { getRiftboundWikiUrl } from '@/lib/cards/links'
import { shouldShowSourceDetails } from '@/lib/content/page-policy'
import { buildRulingRelationIndex, getRulingRelations } from '@/lib/content/ruling-relations'
import { getPageDescription, getPageImage, source } from '@/lib/content/source'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { getMDXComponents } from '@/mdx-components'

const rulingRelationIndex = buildRulingRelationIndex(source.getPages())

export default async function Page(props: PageProps<'/[[...slug]]'>) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const MDX = page.data.body
	const authors = page.data.authors ?? []
	const rulingRelations = getRulingRelations(rulingRelationIndex, page.url)
	const showSourceDetails = shouldShowSourceDetails(page.url)
	const riftboundWikiUrl = page.url.startsWith('/cards/') ? getRiftboundWikiUrl(page.data.title) : undefined
	const coreRulesDocument =
		page.data.rulesDocument?.type === 'core-rules'
			? getCoreRulesDocument(page.data.rulesDocument.version)
			: undefined
	const tournamentRulesDocument =
		page.data.rulesDocument?.type === 'tournament-rules'
			? getTournamentRulesDocument(page.data.rulesDocument.version)
			: undefined
	const toc = coreRulesDocument
		? createCoreRulesNavigation(coreRulesDocument).toc
		: tournamentRulesDocument
			? createTournamentRulesNavigation(tournamentRulesDocument).toc
			: page.data.toc

	return (
		<DocsPage toc={toc} full={page.data.full} footer={{ enabled: false }} tableOfContent={{ style: 'clerk' }}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>
			<PageActions galleryLink={page.data.galleryLink} riftboundWikiUrl={riftboundWikiUrl} />
			{page.data.reviewedCoreRulesVersion && (
				<CoreRulesReviewCallout reviewedCoreRulesVersion={page.data.reviewedCoreRulesVersion} />
			)}
			<CopyableDocsBody>
				<MDX
					components={getMDXComponents(
						createRelativeLink(source, page),
						page.data.reviewedCoreRulesVersion,
						coreRulesDocument,
						tournamentRulesDocument,
					)}
				/>
			</CopyableDocsBody>
			<RelatedRulings relations={rulingRelations} />
			<Feedback onSendAction={submitPageFeedback} />
			{showSourceDetails && <PageAttribution authors={authors} lastModified={page.data.lastModified} />}
		</DocsPage>
	)
}

export async function generateStaticParams() {
	return source.generateParams()
}

export async function generateMetadata(props: PageProps<'/[[...slug]]'>): Promise<Metadata> {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const url = new URL(page.url, SITE_URL).toString()

	return {
		title: page.data.title,
		description: getPageDescription(page),
		robots: page.data.noindex ? { index: false, follow: true } : undefined,
		alternates: { canonical: url },
		openGraph: {
			type: 'website',
			siteName: SITE_NAME,
			url,
			images: getPageImage(page).url,
		},
	}
}
