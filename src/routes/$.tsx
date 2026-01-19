import browserCollections from 'fumadocs-mdx:collections/browser'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { Authors } from '@/components/authors'
import { CardGalleryLink } from '@/components/card-gallery-link'
import { CrdCallout } from '@/components/crd-callout'
import { CrdVersionProvider } from '@/components/crd-version'
import { EditPageLink } from '@/components/edit-page-link'
import { Rule } from '@/components/rule'
import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'

export const Route = createFileRoute('/$')({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split('/') ?? []
		const data = await loader({ data: slugs })
		await clientLoader.preload(data.path)
		return data
	},
	head: async ({ params, loaderData }) => {
		const slugs = params._splat?.split('/') ?? []
		const isRoot = slugs.filter(Boolean).length === 0

		const title =
			!isRoot && loaderData?.title ? `Riftbound FAQ - ${loaderData.title}` : 'Riftbound FAQ & Rules Wiki'
		const description =
			loaderData?.description ||
			(loaderData?.title
				? `FAQ and rules reference for ${loaderData.title} in Riftbound`
				: 'Community-driven FAQ and rules reference for Riftbound TCG judges and players')

		return {
			meta: [
				...(!isRoot && loaderData?.title ? [{ title }] : []),
				{ name: 'description', content: description },
				{ property: 'og:title', content: title },
				{ property: 'og:description', content: description },
				{ property: 'og:type', content: 'website' },
				{ property: 'og:site_name', content: 'Riftbound FAQ' },
				{ name: 'twitter:card', content: 'summary' },
				{ name: 'twitter:title', content: title },
				{ name: 'twitter:description', content: description },
			],
		}
	},
})

const loader = createServerFn()
	.inputValidator((slugs: string[]) => slugs)
	.middleware([staticFunctionMiddleware])
	.handler(async ({ data: slugs }) => {
		const page = source.getPage(slugs)
		if (!page) throw notFound()

		return {
			pageTree: await source.serializePageTree(source.getPageTree()),
			path: page.path,
			title: page.data.title,
			description: page.data.description,
		}
	})

const clientLoader = browserCollections.docs.createClientLoader({
	id: 'docs',
	component({ toc, frontmatter, default: MDX }, props: { path: string }) {
		const authors = frontmatter.authors ?? []
		return (
			<DocsPage
				footer={{ enabled: false }}
				toc={toc}
				tableOfContent={{
					style: 'clerk',
					footer: (
						<div className="flex flex-col gap-8 mt-6">
							{authors.length !== 0 && <Authors authors={authors} />}
							<div className="text-sm text-fd-muted-foreground flex flex-col gap-4 justify-start">
								{frontmatter.galleryLink && <CardGalleryLink galleryLink={frontmatter.galleryLink} />}
								<EditPageLink filePath={props.path} />
							</div>
						</div>
					),
				}}
			>
				<DocsTitle>{frontmatter.title}</DocsTitle>
				{frontmatter.crdVersion && <CrdCallout crdVersion={frontmatter.crdVersion} />}
				<DocsDescription>{frontmatter.description}</DocsDescription>
				<DocsBody>
					<CrdVersionProvider crdVersion={frontmatter.crdVersion}>
						<MDX components={{ ...defaultMdxComponents, Rule }} />
					</CrdVersionProvider>
				</DocsBody>
			</DocsPage>
		)
	},
})

function Page() {
	const data = Route.useLoaderData()
	const Content = clientLoader.getComponent(data.path)
	const { pageTree } = useFumadocsLoader(data)

	return (
		<DocsLayout {...baseOptions()} tree={pageTree}>
			<Content path={data.path} />
		</DocsLayout>
	)
}
