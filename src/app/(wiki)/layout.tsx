import { DocsLayout } from 'fumadocs-ui/layouts/spacious'
import { source } from '@/lib/content/source'
import { GITHUB_REPO_URL, SITE_NAME, X_URL } from '@/lib/site'

function XIcon() {
	return (
		<svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 24 24">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	)
}

export default function Layout({ children }: LayoutProps<'/'>) {
	return (
		<DocsLayout
			tree={source.getPageTree()}
			nav={{ title: SITE_NAME }}
			githubUrl={GITHUB_REPO_URL}
			links={[
				{
					type: 'icon',
					label: 'View @civicevic on X',
					text: '@civicevic on X',
					url: X_URL,
					external: true,
					icon: <XIcon />,
				},
			]}
		>
			{children}
		</DocsLayout>
	)
}
