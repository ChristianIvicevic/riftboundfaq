import './global.css'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { NOTO_SANS } from '@/app/fonts'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
	metadataBase: SITE_URL,
	applicationName: SITE_NAME,
	title: {
		default: SITE_NAME,
		template: `%s | ${SITE_NAME}`,
	},
	description: SITE_DESCRIPTION,
}

export default function Layout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="en" className={NOTO_SANS.className} suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				{children}
				<Analytics />
			</body>
		</html>
	)
}
