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
	component({ toc, frontmatter, default: MDX }) {
		return (
			<DocsPage toc={toc}>
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
			<Content />
		</DocsLayout>
	)
}
