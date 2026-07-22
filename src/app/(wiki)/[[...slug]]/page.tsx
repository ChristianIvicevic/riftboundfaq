import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { submitPageFeedback } from '@/actions/feedback'
import { Authors } from '@/components/authors'
import { CardGalleryLink, EditThisPageLink } from '@/components/buttons'
import { CoreRulesDiff } from '@/components/core-rules/diff-view'
import { Rule } from '@/components/core-rules/rule'
import { CoreRulesTable } from '@/components/core-rules/table'
import { CrdVersionProvider } from '@/components/core-rules/version'
import { CrdVersionCallout } from '@/components/core-rules/version-callout'
import { Feedback } from '@/components/feedback/client'
import { KEYWORDS } from '@/components/keywords'
import { LastUpdated } from '@/components/last-updated'
import { RelatedRulings } from '@/components/related-rulings'
import { Energy, RUNES, Universal } from '@/components/resources'
import { TournamentRulesDiff } from '@/components/tournament-rules/diff-view'
import { TournamentRulesTable } from '@/components/tournament-rules/table'
import { baseUrl } from '@/lib/metadata'
import { getPageImage, getPageRulingRelations, source } from '@/lib/source'
import { getMDXComponents } from '@/mdx-components'

export default async function Page(props: PageProps<'/[[...slug]]'>) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const MDX = page.data.body
	const authors = page.data.authors ?? []
	const rulingRelations = getPageRulingRelations(page.url)

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
			<DocsBody>
				<CrdVersionProvider crdVersion={page.data.crdVersion}>
					<MDX
						components={getMDXComponents({
							a: createRelativeLink(source, page),
							Rule,
							CoreRulesTable,
							CoreRulesDiff,
							TournamentRulesTable,
							TournamentRulesDiff,
							Energy,
							Universal,
							...RUNES,
							...KEYWORDS,
						})}
					/>
				</CrdVersionProvider>
			</DocsBody>
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
