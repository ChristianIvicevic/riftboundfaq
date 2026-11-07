import { DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/spacious/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CopyableDocsBody } from '@/app/(wiki)/[[...slug]]/_components/copyable-docs-body'
import {
	CoreRulesSetLogoHeader,
	type CoreRulesSetLogoHeaderData,
} from '@/app/(wiki)/[[...slug]]/_components/core-rules-set-logo-header'
import { PageAttribution } from '@/app/(wiki)/[[...slug]]/_components/page-attribution'
import { CardReference } from '@/components/cards/card-reference'
import { OutdatedCoreRulesReviewCallout } from '@/components/core-rules/review-callout'
import { CurrentCoreRulesReviewStatus } from '@/components/core-rules/review-status'
import { submitBlockFeedback, submitPageFeedback } from '@/features/feedback/actions'
import { Feedback, FeedbackText } from '@/features/feedback/feedback'
import { resolveRulesChangeRoute } from '@/features/rules-documents/change-route'
import { resolveCoreRulesReview } from '@/features/rules-documents/core-rules-review'
import { rulesDocuments } from '@/features/rules-documents/registry'
import { resolveVersionedRulesRoute } from '@/features/rules-documents/versioned-route'
import { getCardReference } from '@/lib/cards/catalog'
import { getPagePublishingDetails } from '@/lib/content/page-publishing-details'
import { getPageImage, PAGE_IMAGE_SIZE, source } from '@/lib/content/source'
import { SITE_NAME, SITE_URL, X_HANDLE } from '@/lib/site'
import { getMDXComponents } from '@/mdx-components'

export default async function Page(props: PageProps<'/[[...slug]]'>) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const MDX = page.data.body
	const authors = page.data.authors ?? []
	const publishingDetails = getPagePublishingDetails(page)
	const coreRulesReview = resolveCoreRulesReview({
		url: page.url,
		reviewedVersion: page.data.reviewedCoreRulesVersion,
	})
	const cardName = page.url.startsWith('/cards/') ? page.data.title : undefined
	const cardReference = cardName ? getCardReference(cardName) : undefined
	if (cardName && !cardReference) {
		throw new Error(`Card page title is missing from the catalog: ${cardName}`)
	}
	const resolvedRulesDocumentPage = resolveVersionedRulesRoute({
		url: page.url,
		rulesDocument: page.data.rulesDocument,
	})
	const resolvedRulesChangePage = resolveRulesChangeRoute(page.url)
	let coreRulesSetLogoHeaderData: CoreRulesSetLogoHeaderData | undefined
	if (resolvedRulesDocumentPage?.document.identity.type === 'core-rules') {
		coreRulesSetLogoHeaderData = {
			kind: 'document',
			edition: resolvedRulesDocumentPage.document.identity,
		}
	} else if (resolvedRulesChangePage?.type === 'core-rules') {
		const coreRules = rulesDocuments.family('core-rules')
		coreRulesSetLogoHeaderData = {
			kind: 'change',
			from: coreRules.get(resolvedRulesChangePage.from).identity,
			to: coreRules.get(resolvedRulesChangePage.to).identity,
		}
	}
	const toc = resolvedRulesDocumentPage
		? [...resolvedRulesDocumentPage.toc]
		: resolvedRulesChangePage
			? [...resolvedRulesChangePage.toc]
			: page.data.toc
	const structuredData =
		page.url === '/'
			? {
					'@context': 'https://schema.org',
					'@type': 'WebSite',
					name: SITE_NAME,
					url: SITE_URL.toString(),
					description: publishingDetails.description,
					inLanguage: 'en',
				}
			: publishingDetails.isEditorial
				? {
						'@context': 'https://schema.org',
						'@type': 'Article',
						headline: page.data.title,
						description: publishingDetails.description,
						url: new URL(page.url, SITE_URL).toString(),
						mainEntityOfPage: new URL(page.url, SITE_URL).toString(),
						image: new URL(getPageImage(page).url, SITE_URL).toString(),
						datePublished: page.data.createdAt,
						dateModified: page.data.lastModified?.toISOString(),
						author:
							authors.length > 0
								? authors.map(({ name, url }) => ({ '@type': 'Person', name, url }))
								: undefined,
						isPartOf: {
							'@type': 'WebSite',
							name: SITE_NAME,
							url: SITE_URL.toString(),
						},
					}
				: undefined

	return (
		<DocsPage
			toc={toc}
			full={page.data.full}
			footer={{ enabled: false }}
			tableOfContent={{ style: 'normal' }}
		>
			{structuredData && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(structuredData).replaceAll('<', '\\u003c'),
					}}
				/>
			)}
			{coreRulesSetLogoHeaderData ? (
				<CoreRulesSetLogoHeader
					data={coreRulesSetLogoHeaderData}
					description={publishingDetails.description}
					title={page.data.title}
				/>
			) : (
				<>
					{coreRulesReview?.reviewStatus === 'up-to-date' ? (
						<div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
							<DocsTitle className="min-w-0">{page.data.title}</DocsTitle>
							<CurrentCoreRulesReviewStatus currentVersion={coreRulesReview.currentVersion} />
						</div>
					) : (
						<DocsTitle>{page.data.title}</DocsTitle>
					)}
					<DocsDescription className="mb-0">{publishingDetails.description}</DocsDescription>
				</>
			)}
			{cardName && cardReference ? (
				<CardReference
					errataHref={`/card-errata-list#${page.url.slice('/cards/'.length)}`}
					name={cardName}
					reference={cardReference}
				/>
			) : coreRulesSetLogoHeaderData ? null : (
				<div className="mb-5 border-b pb-6" />
			)}
			{coreRulesReview?.reviewStatus === 'outdated' && (
				<OutdatedCoreRulesReviewCallout
					currentVersion={coreRulesReview.currentVersion}
					reviewedVersion={coreRulesReview.reviewedVersion}
				/>
			)}
			<FeedbackText onSendAction={submitBlockFeedback}>
				<CopyableDocsBody>
					<MDX
						components={getMDXComponents(
							createRelativeLink(source, page),
							coreRulesReview?.document,
							resolvedRulesDocumentPage,
							resolvedRulesChangePage,
						)}
					/>
				</CopyableDocsBody>
			</FeedbackText>
			<Feedback onSendAction={submitPageFeedback} />
			{publishingDetails.isSourceAttributionEligible && (
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

	const publishingDetails = getPagePublishingDetails(page)
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
				page.url === '/'
					? publishingDetails.metadataTitle
					: `${SITE_NAME} social preview for ${page.data.title}`,
		},
	}

	return {
		title: page.url === '/' ? { absolute: publishingDetails.metadataTitle } : publishingDetails.metadataTitle,
		description: publishingDetails.description,
		authors: publishingDetails.isEditorial ? authors : undefined,
		robots: publishingDetails.isIndexable ? undefined : { index: false, follow: true },
		alternates: { canonical: url },
		openGraph: publishingDetails.isEditorial
			? {
					type: 'article',
					...openGraphBase,
					publishedTime: page.data.createdAt
						? new Date(`${page.data.createdAt}T00:00:00Z`).toISOString()
						: undefined,
					modifiedTime: page.data.lastModified?.toISOString(),
					authors: authors.map(({ name }) => name),
				}
			: { type: 'website', ...openGraphBase },
		twitter: {
			card: 'summary_large_image',
			site: X_HANDLE,
			creator: publishingDetails.isEditorial ? X_HANDLE : undefined,
		},
	}
}
