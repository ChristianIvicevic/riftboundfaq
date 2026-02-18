import './global.css'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { baseUrl } from '@/lib/metadata'

export const metadata: Metadata = {
	metadataBase: baseUrl,
	applicationName: 'Riftbound FAQ',
	title: {
		default: 'Riftbound FAQ',
		template: '%s | Riftbound FAQ',
	},
	description: 'Community-driven FAQ for Riftbound judges and players',
}

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function Layout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				<RootProvider>{children}</RootProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	)
}
