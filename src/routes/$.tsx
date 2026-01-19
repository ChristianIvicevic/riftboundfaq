import browserCollections from 'fumadocs-mdx:collections/browser'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import { Callout } from 'fumadocs-ui/components/callout'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { CrdVersionProvider } from '@/components/crd-version'
import { Rule } from '@/components/rule'
import { CURRENT_CRD_VERSION } from '@/lib/constants'
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
		return (
			<DocsPage
				footer={{ enabled: false }}
				toc={toc}
				tableOfContent={{
					footer: (
						<div className="text-sm text-fd-muted-foreground mt-6 flex flex-col gap-4 justify-start">
							{frontmatter.galleryLink && (
								<a
									className="hover:text-fd-foreground transition-colors flex gap-2 items-center"
									href={frontmatter.galleryLink}
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
										<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" />
										<path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
										<circle cx="13" cy="7" r="1" fill="currentColor" />
										<rect x="8" y="2" width="14" height="14" rx="2" />
									</svg>
									Open in Card Callery
								</a>
							)}
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
				{frontmatter.crdVersion && (
					<Callout type={frontmatter.crdVersion === CURRENT_CRD_VERSION ? 'success' : 'warn'}>
						{frontmatter.crdVersion === CURRENT_CRD_VERSION ? (
							<>
								<strong>Up-to-date:</strong> This page references the current core rules document version (
								{CURRENT_CRD_VERSION}).
							</>
						) : (
							<>
								<strong>Outdated:</strong> This page references an older version ({frontmatter.crdVersion}) of
								the core rules document. Rule numbers and content may have changed in the current version (
								{CURRENT_CRD_VERSION}) and are not guaranteed to be correct. A revision is needed.
							</>
						)}
					</Callout>
				)}
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
