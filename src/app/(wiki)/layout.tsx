import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/lib/content/source'
import { GITHUB_REPO_URL, SITE_NAME } from '@/lib/site'

export default function Layout({ children }: LayoutProps<'/'>) {
	return (
		<DocsLayout tree={source.getPageTree()} nav={{ title: SITE_NAME }} githubUrl={GITHUB_REPO_URL}>
			{children}
		</DocsLayout>
	)
}
