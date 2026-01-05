import browserCollections from 'fumadocs-mdx:collections/browser'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
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
})

const loader = createServerFn()
	.inputValidator((slugs: string[]) => slugs)
	.middleware([staticFunctionMiddleware])
	.handler(async ({ data: slugs }) => {
		const page = source.getPage(slugs)
		if (!page) throw notFound()

		return { pageTree: await source.serializePageTree(source.getPageTree()), path: page.path }
	})

const clientLoader = browserCollections.docs.createClientLoader({
	id: 'docs',
	component({ toc, frontmatter, default: MDX }, props: { path: string }) {
		return (
			<DocsPage
				toc={toc}
				tableOfContent={{
					footer: (
						<div className="text-sm text-fd-muted-foreground mt-6">
							<a
								className="hover:text-fd-foreground transition-colors flex gap-2 items-center"
								href={`https://github.com/ChristianIvicevic/riftboundfaq/blob/main/content/${props.path}`}
								rel="noopener noreferrer"
								target="_blank"
							>
								{/** biome-ignore lint/a11y/noSvgWithoutTitle: Ignore title */}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="size-4"
								>
									<path d="M13 21h8" />
									<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
								</svg>
								Edit this page
							</a>
						</div>
					),
				}}
			>
				<DocsTitle>{frontmatter.title}</DocsTitle>
				<DocsDescription>{frontmatter.description}</DocsDescription>
				<DocsBody>
					<MDX components={defaultMdxComponents} />
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
