import { Noto_Sans, Noto_Serif } from 'next/font/google'

export const NOTO_SANS = Noto_Sans({ subsets: ['latin'], display: 'swap' })
export const NOTO_SERIF = Noto_Serif({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-noto-serif',
})
