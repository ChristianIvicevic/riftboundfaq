import { DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Authors } from '@/components/authors'
import { CardGalleryLink, EditThisPageLink } from '@/components/buttons'
import { CopyableDocsBody } from '@/components/copyable-docs-body'
import { CrdVersionCallout } from '@/components/core-rules/version-callout'
import { LastUpdated } from '@/components/last-updated'
import { RelatedRulings } from '@/components/related-rulings'
import { submitPageFeedback } from '@/features/feedback/actions'
import { Feedback } from '@/features/feedback/feedback'
import { buildRulingRelationIndex, getRulingRelations } from '@/lib/content/ruling-relations'
import { getPageImage, source } from '@/lib/content/source'
import { baseUrl } from '@/lib/metadata'
import { getMDXComponents } from '@/mdx-components'

const rulingRelationIndex = buildRulingRelationIndex(source.getPages())

export default async function Page(props: PageProps<'/[[...slug]]'>) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const MDX = page.data.body
	const authors = page.data.authors ?? []
	const rulingRelations = getRulingRelations(rulingRelationIndex, page.url)

	return (
		<DocsPage
			toc={page.data.toc}
			full={page.data.full}
			footer={{ enabled: false }}
			tableOfContent={{ style: 'clerk' }}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>
			<div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
				{page.data.galleryLink && <CardGalleryLink href={page.data.galleryLink} />}
				<EditThisPageLink filePath={page.path} />
			</div>
			{page.data.crdVersion && <CrdVersionCallout crdVersion={page.data.crdVersion} />}
			<CopyableDocsBody>
				<MDX components={getMDXComponents(createRelativeLink(source, page), page.data.crdVersion)} />
			</CopyableDocsBody>
			<RelatedRulings relations={rulingRelations} />
			<Feedback onSendAction={submitPageFeedback} />
			<div className="flex gap-1 pt-2">
				{authors.length > 0 && <Authors authors={authors} />}
				{page.data.lastModified && <LastUpdated value={page.data.lastModified} />}
			</div>
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

	const description =
		page.data.description ||
		(page.data.title
			? `FAQ and rules reference for ${page.data.title} in Riftbound`
			: 'Community-driven FAQ for Riftbound judges and players')

	const url = new URL(page.url, baseUrl).toString()

	return {
		title: page.data.title,
		description,
		robots: page.data.noindex ? { index: false, follow: true } : undefined,
		alternates: { canonical: url },
		openGraph: {
			type: 'website',
			siteName: 'Riftbound FAQ',
			url,
			images: getPageImage(page).url,
		},
	}
}
