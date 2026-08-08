import './global.css'
import { Tooltip } from '@base-ui/react/tooltip'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function Layout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				<RootProvider>
					<Tooltip.Provider>{children}</Tooltip.Provider>
				</RootProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	)
}
