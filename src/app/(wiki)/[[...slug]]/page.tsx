import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { submitPageFeedback } from '@/actions/feedback'
import { Authors } from '@/components/authors'
import { CardGalleryLink, EditThisPageLink } from '@/components/buttons'
import { CrdCallout } from '@/components/crd-callout'
import { CrdVersionProvider } from '@/components/crd-version'
import { Feedback } from '@/components/feedback/client'
import { Accelerate, Assault, Equip, QuickDraw, Repeat, Shield, Weaponmaster } from '@/components/keywords'
import { LastUpdated } from '@/components/last-updated'
import { Energy, Power } from '@/components/resources'
import { Rule } from '@/components/rule'
import { baseUrl } from '@/lib/metadata'
import { getPageImage, source } from '@/lib/source'
import { getMDXComponents } from '@/mdx-components'

export default async function Page(props: PageProps<'/[[...slug]]'>) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const MDX = page.data.body
	const authors = page.data.authors ?? []

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
			{page.data.crdVersion && <CrdCallout crdVersion={page.data.crdVersion} />}
			<DocsBody>
				<CrdVersionProvider crdVersion={page.data.crdVersion}>
					<MDX
						components={getMDXComponents({
							a: createRelativeLink(source, page),
							Rule,
							Energy,
							Power,
							Accelerate,
							Assault,
							Shield,
							Equip,
							QuickDraw,
							Weaponmaster,
							Repeat,
						})}
					/>
				</CrdVersionProvider>
			</DocsBody>
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
		alternates: { canonical: url },
		openGraph: {
			type: 'website',
			siteName: 'Riftbound FAQ',
			url,
			images: getPageImage(page).url,
		},
	}
}
