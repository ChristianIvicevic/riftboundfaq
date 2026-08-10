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
import { rulesDocuments } from '@/features/rules-documents/registry'
import { getRiftboundWikiUrl } from '@/lib/cards/links'
import { getPageDescription } from '@/lib/content/page-description'
import { isEditorialRulingPage, shouldShowSourceDetails } from '@/lib/content/page-policy'
import { getPageTitle } from '@/lib/content/page-title'
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
	const description = getPageDescription(page)
	const isEditorial = isEditorialRulingPage(page.url)
	const rulingRelations = getRulingRelations(rulingRelationIndex, page.url)
	const showSourceDetails = shouldShowSourceDetails(page.url)
	const riftboundWikiUrl = page.url.startsWith('/cards/') ? getRiftboundWikiUrl(page.data.title) : undefined
	const rulesDocument = page.data.rulesDocument ? rulesDocuments.get(page.data.rulesDocument) : undefined
	const toc = rulesDocument
		? rulesDocument.navigation.map(({ id, text, anchor, depth }) => ({
				title: `${id}. ${text}`,
				url: `#${anchor}`,
				depth,
			}))
		: page.data.toc
	const structuredData =
		page.url === '/'
			? {
					'@context': 'https://schema.org',
					'@type': 'WebSite',
					name: SITE_NAME,
					url: SITE_URL.toString(),
					description,
					inLanguage: 'en',
				}
			: isEditorial
				? {
						'@context': 'https://schema.org',
						'@type': 'Article',
						headline: page.data.title,
						description,
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
			<DocsDescription className="mb-0">{description}</DocsDescription>
			<PageActions galleryLink={page.data.galleryLink} riftboundWikiUrl={riftboundWikiUrl} />
			{page.data.reviewedCoreRulesVersion && (
				<CoreRulesReviewCallout reviewedCoreRulesVersion={page.data.reviewedCoreRulesVersion} />
			)}
			<CopyableDocsBody>
				<MDX
					components={getMDXComponents(
						createRelativeLink(source, page),
						page.data.reviewedCoreRulesVersion,
						rulesDocument,
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
	const title = getPageTitle(page)
	const image = getPageImage(page).url
	const authors = page.data.authors ?? []
	const isEditorial = isEditorialRulingPage(page.url)
	const openGraphBase = {
		siteName: SITE_NAME,
		url,
		images: {
			url: image,
			...PAGE_IMAGE_SIZE,
			type: 'image/png',
			alt: page.url === '/' ? title : `${SITE_NAME} social preview for ${page.data.title}`,
		},
	}

	return {
		title: page.url === '/' ? { absolute: title } : title,
		description: getPageDescription(page),
		authors: isEditorial ? authors.map((name) => ({ name })) : undefined,
		robots: page.data.noindex ? { index: false, follow: true } : undefined,
		alternates: { canonical: url },
		openGraph: isEditorial
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
			creator: isEditorial ? X_HANDLE : undefined,
		},
	}
}
