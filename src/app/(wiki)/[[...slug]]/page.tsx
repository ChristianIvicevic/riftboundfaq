import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Authors } from '@/components/authors'
import { CardGalleryLink } from '@/components/card-gallery-link'
import { CrdCallout } from '@/components/crd-callout'
import { CrdVersionProvider } from '@/components/crd-version'
import { EditPageLink } from '@/components/edit-page-link'
import { Rule } from '@/components/rule'
import { source } from '@/lib/source'
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
			tableOfContent={{
				style: 'clerk',
				footer: (
					<div className="flex flex-col gap-8 mt-6">
						{authors.length !== 0 && <Authors authors={authors} />}
						<div className="text-sm text-fd-muted-foreground flex flex-col gap-4 justify-start">
							{page.data.galleryLink && <CardGalleryLink galleryLink={page.data.galleryLink} />}
							<EditPageLink filePath={page.path} />
						</div>
					</div>
				),
			}}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>
			{page.data.crdVersion && <CrdCallout crdVersion={page.data.crdVersion} />}
			<DocsBody>
				<CrdVersionProvider crdVersion={page.data.crdVersion}>
					<MDX components={getMDXComponents({ a: createRelativeLink(source, page), Rule })} />
				</CrdVersionProvider>
			</DocsBody>
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

	const title = `Riftbound FAQ - ${page.data.title}`
	const description =
		page.data.description ||
		(page.data.title
			? `FAQ and rules reference for ${page.data.title} in Riftbound`
			: 'Community-driven FAQ for Riftbound judges and players')

	return { title, description }
}
