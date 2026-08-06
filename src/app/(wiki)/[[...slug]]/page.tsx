import { DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CopyableDocsBody } from '@/app/(wiki)/[[...slug]]/_components/copyable-docs-body'
import { PageActions } from '@/app/(wiki)/[[...slug]]/_components/page-actions'
import { PageAttribution } from '@/app/(wiki)/[[...slug]]/_components/page-attribution'
import { RelatedRulings } from '@/app/(wiki)/[[...slug]]/_components/related-rulings'
import { CrdVersionCallout } from '@/components/core-rules/version-callout'
import { submitPageFeedback } from '@/features/feedback/actions'
import { Feedback } from '@/features/feedback/feedback'
import { getRiftboundWikiUrl } from '@/lib/cards/links'
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
	const riftboundWikiUrl = page.url.startsWith('/cards/') ? getRiftboundWikiUrl(page.data.title) : undefined

	return (
		<DocsPage
			toc={page.data.toc}
			full={page.data.full}
			footer={{ enabled: false }}
			tableOfContent={{ style: 'clerk' }}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>
			<PageActions
				galleryLink={page.data.galleryLink}
				riftboundWikiUrl={riftboundWikiUrl}
				filePath={page.path}
			/>
			{page.data.crdVersion && <CrdVersionCallout crdVersion={page.data.crdVersion} />}
			<CopyableDocsBody>
				<MDX components={getMDXComponents(createRelativeLink(source, page), page.data.crdVersion)} />
			</CopyableDocsBody>
			<RelatedRulings relations={rulingRelations} />
			<Feedback onSendAction={submitPageFeedback} />
			<PageAttribution authors={authors} lastModified={page.data.lastModified} />
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
