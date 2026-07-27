import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/lib/content/source'
import { baseOptions } from '@/lib/layout.shared'

export default function Layout({ children }: LayoutProps<'/'>) {
	return (
		<DocsLayout tree={source.getPageTree()} {...baseOptions()}>
			{children}
		</DocsLayout>
	)
}
