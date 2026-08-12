import { DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CopyableDocsBody } from '@/app/(wiki)/[[...slug]]/_components/copyable-docs-body'
import { PageActions } from '@/app/(wiki)/[[...slug]]/_components/page-actions'
import { PageAttribution } from '@/app/(wiki)/[[...slug]]/_components/page-attribution'
import { RelatedRulings } from '@/app/(wiki)/[[...slug]]/_components/related-rulings'
import { CoreRulesReviewCallout } from '@/components/core-rules/review-callout'
import { submitPageFeedback } from '@/features/feedback/actions'
import { Feedback } from '@/features/feedback/feedback'
import { resolveCoreRulesReview } from '@/features/rules-documents/core-rules-review'
import { resolveVersionedRulesRoute } from '@/features/rules-documents/versioned-route'
import { getRiftboundWikiUrl } from '@/lib/cards/links'
import { getPagePublication } from '@/lib/content/page-publication'
import { buildRulingRelationIndex, getRulingRelations } from '@/lib/content/ruling-relations'
import { getPageImage, PAGE_IMAGE_SIZE, source } from '@/lib/content/source'
import { SITE_NAME, SITE_URL, X_HANDLE } from '@/lib/site'
import { getMDXComponents } from '@/mdx-components'

const rulingRelationIndex = buildRulingRelationIndex(source.getPages())

export default async function Page(props: PageProps<'/[[...slug]]'>) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const MDX = page.data.body
	const authors = page.data.authors ?? []
	const publication = getPagePublication(page)
	const coreRulesReview = resolveCoreRulesReview({
		url: page.url,
		reviewedVersion: page.data.reviewedCoreRulesVersion,
	})
	const rulingRelations = getRulingRelations(rulingRelationIndex, page.url)
	const riftboundWikiUrl = page.url.startsWith('/cards/') ? getRiftboundWikiUrl(page.data.title) : undefined
	const versionedRulesRoute = resolveVersionedRulesRoute({
		url: page.url,
		rulesDocument: page.data.rulesDocument,
	})
	const toc = versionedRulesRoute ? [...versionedRulesRoute.toc] : page.data.toc
	const structuredData =
		page.url === '/'
			? {
					'@context': 'https://schema.org',
					'@type': 'WebSite',
					name: SITE_NAME,
					url: SITE_URL.toString(),
					description: publication.description,
					inLanguage: 'en',
				}
			: publication.isEditorial
				? {
						'@context': 'https://schema.org',
						'@type': 'Article',
						headline: page.data.title,
						description: publication.description,
						url: new URL(page.url, SITE_URL).toString(),
						mainEntityOfPage: new URL(page.url, SITE_URL).toString(),
						image: new URL(getPageImage(page).url, SITE_URL).toString(),
						datePublished: page.data.createdAt,
						dateModified: page.data.lastModified?.toISOString(),
						author: authors.length > 0 ? authors.map((name) => ({ '@type': 'Person', name })) : undefined,
						isPartOf: {
							'@type': 'WebSite',
							name: SITE_NAME,
							url: SITE_URL.toString(),
						},
					}
				: undefined

	return (
		<DocsPage toc={toc} full={page.data.full} footer={{ enabled: false }} tableOfContent={{ style: 'clerk' }}>
			{structuredData && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(structuredData).replaceAll('<', '\\u003c'),
					}}
				/>
			)}
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{publication.description}</DocsDescription>
			<PageActions galleryLink={page.data.galleryLink} riftboundWikiUrl={riftboundWikiUrl} />
			{coreRulesReview && (
				<CoreRulesReviewCallout
					currentVersion={coreRulesReview.currentVersion}
					reviewedVersion={coreRulesReview.reviewedVersion}
					status={coreRulesReview.status}
				/>
			)}
			<CopyableDocsBody>
				<MDX
					components={getMDXComponents(
						createRelativeLink(source, page),
						coreRulesReview?.document,
						versionedRulesRoute,
					)}
				/>
			</CopyableDocsBody>
			<RelatedRulings relations={rulingRelations} />
			<Feedback onSendAction={submitPageFeedback} />
			{publication.isSourceAttributionEligible && (
				<PageAttribution authors={authors} lastModified={page.data.lastModified} />
			)}
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

	const publication = getPagePublication(page)
	resolveCoreRulesReview({ url: page.url, reviewedVersion: page.data.reviewedCoreRulesVersion })
	const url = new URL(page.url, SITE_URL).toString()
	const image = getPageImage(page).url
	const authors = page.data.authors ?? []
	const openGraphBase = {
		siteName: SITE_NAME,
		url,
		images: {
			url: image,
			...PAGE_IMAGE_SIZE,
			type: 'image/png',
			alt:
				page.url === '/' ? publication.metadataTitle : `${SITE_NAME} social preview for ${page.data.title}`,
		},
	}

	return {
		title: page.url === '/' ? { absolute: publication.metadataTitle } : publication.metadataTitle,
		description: publication.description,
		authors: publication.isEditorial ? authors.map((name) => ({ name })) : undefined,
		robots: publication.isIndexable ? undefined : { index: false, follow: true },
		alternates: { canonical: url },
		openGraph: publication.isEditorial
			? {
					type: 'article',
					...openGraphBase,
					publishedTime: page.data.createdAt
						? new Date(`${page.data.createdAt}T00:00:00Z`).toISOString()
						: undefined,
					modifiedTime: page.data.lastModified?.toISOString(),
					authors,
				}
			: { type: 'website', ...openGraphBase },
		twitter: {
			card: 'summary_large_image',
			site: X_HANDLE,
			creator: publication.isEditorial ? X_HANDLE : undefined,
		},
	}
}
